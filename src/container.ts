import { container, instanceCachingFactory } from "tsyringe";
import { drizzle } from "drizzle-orm/d1";
import { AwsClient } from "aws4fetch";
import { env } from "cloudflare:workers";
import { APP_CONFIG, type AppConfig } from "./config";
import { SubscriberRepository } from "./repository/subscriber-repository";
import { EmailRenderer } from "./services/email-renderer";
import { EmailSender, type IEmailSender } from "./services/email-sender";
import { NotificationService } from "./services/notification-service";
import { SubscribeCommand } from "./use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "./use-cases/confirm-subscription-command";
import { ConfirmEmailChangeCommand } from "./use-cases/confirm-email-change-command";
import { ConfirmCommand } from "./use-cases/confirm-command";
import { RequestMagicLinkCommand } from "./use-cases/request-magic-link-command";
import { ValidateMagicLinkCommand } from "./use-cases/validate-magic-link-command";
import { UpdateProfileCommand } from "./use-cases/update-profile-command";
import { UnsubscribeCommand } from "./use-cases/unsubscribe-command";
import { RemoveSubscriberCommand } from "./use-cases/remove-subscriber-command";
import { ListSubscribersQuery } from "./use-cases/list-subscribers-query";
import { SendTestEmailCommand } from "./use-cases/send-test-email-command";
import { Logger } from "./services/logger";
import { AdminAuthService } from "./services/admin-auth-service";

export const DATABASE = Symbol("DATABASE");
export const AWS_CLIENT = Symbol("AWS_CLIENT");
export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
export { APP_CONFIG };

container.register(DATABASE, {
  useFactory: instanceCachingFactory(() => drizzle(env.DB)),
});

container.register(AWS_CLIENT, {
  useFactory: instanceCachingFactory(
    () =>
      new AwsClient({
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      }),
  ),
});

container.register(APP_CONFIG, {
  useFactory: instanceCachingFactory(
    (): AppConfig => ({
      baseUrl: env.BASE_URL,
      confirmationTtlMs: 24 * 60 * 60 * 1000,
      magicLinkTtlMs: 15 * 60 * 1000,
      awsRegion: env.AWS_REGION,
      fromAddress: env.FROM_ADDRESS,
      auth: {
        teamName: env.CF_ACCESS_TEAM_NAME,
        aud: env.CF_ACCESS_AUD,
        disableAuth: env.DISABLE_AUTH === "true",
      },
    }),
  ),
});

container.register(EMAIL_SENDER, {
  useFactory: instanceCachingFactory((c) => {
    return new EmailSender(
      c.resolve(AWS_CLIENT),
      c.resolve<AppConfig>(APP_CONFIG),
    );
  }),
});

container.register(NotificationService, {
  useFactory: (c) => {
    const config = c.resolve<AppConfig>(APP_CONFIG);
    return new NotificationService(
      c.resolve(EmailRenderer),
      c.resolve<IEmailSender>(EMAIL_SENDER),
      config.baseUrl,
    );
  },
});

container.register(SubscriberRepository, {
  useFactory: instanceCachingFactory((c) => {
    return new SubscriberRepository(c.resolve(DATABASE));
  }),
});

container.register(SubscribeCommand, {
  useFactory: (c) => {
    return new SubscribeCommand(
      c.resolve(SubscriberRepository),
      c.resolve<AppConfig>(APP_CONFIG),
      c.resolve(NotificationService),
    );
  },
});

container.register(ConfirmSubscriptionCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new ConfirmSubscriptionCommand(c.resolve(SubscriberRepository));
  }),
});

container.register(ConfirmEmailChangeCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new ConfirmEmailChangeCommand(c.resolve(SubscriberRepository));
  }),
});

container.register(ConfirmCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new ConfirmCommand(
      c.resolve(ConfirmSubscriptionCommand),
      c.resolve(ConfirmEmailChangeCommand),
    );
  }),
});

container.register(RequestMagicLinkCommand, {
  useFactory: (c) => {
    return new RequestMagicLinkCommand(
      c.resolve(SubscriberRepository),
      c.resolve<AppConfig>(APP_CONFIG),
      c.resolve(NotificationService),
    );
  },
});

container.register(ValidateMagicLinkCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new ValidateMagicLinkCommand(c.resolve(SubscriberRepository));
  }),
});

container.register(UpdateProfileCommand, {
  useFactory: (c) => {
    return new UpdateProfileCommand(
      c.resolve(SubscriberRepository),
      c.resolve(ValidateMagicLinkCommand),
      c.resolve<AppConfig>(APP_CONFIG),
      c.resolve(NotificationService),
    );
  },
});

container.register(UnsubscribeCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new UnsubscribeCommand(c.resolve(SubscriberRepository));
  }),
});

container.register(RemoveSubscriberCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new RemoveSubscriberCommand(c.resolve(SubscriberRepository));
  }),
});

container.register(ListSubscribersQuery, {
  useFactory: instanceCachingFactory((c) => {
    return new ListSubscribersQuery(c.resolve(SubscriberRepository));
  }),
});

container.register(SendTestEmailCommand, {
  useFactory: (c) => {
    return new SendTestEmailCommand(
      c.resolve(NotificationService),
      c.resolve<AppConfig>(APP_CONFIG),
    );
  },
});

container.registerSingleton(EmailRenderer);
container.registerSingleton(Logger);

container.register(AdminAuthService, {
  useFactory: instanceCachingFactory((c) => {
    const config = c.resolve<AppConfig>(APP_CONFIG);
    return new AdminAuthService(c.resolve(Logger), config.auth);
  }),
});

export { container };
