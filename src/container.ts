import { container, instanceCachingFactory } from "tsyringe";
import { drizzle } from "drizzle-orm/d1";
import { AwsClient } from "aws4fetch";
import { env } from "cloudflare:workers";
import { SubscriberRepository } from "./repository/subscriber-repository";
import { EmailRenderer } from "./services/email-renderer";
import { EmailSender } from "./services/email-sender";
import { NotificationService } from "./services/notification-service";
import { SubscribeCommand } from "./use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "./use-cases/confirm-subscription-command";
import { ConfirmEmailChangeCommand } from "./use-cases/confirm-email-change-command";
import { RequestMagicLinkCommand } from "./use-cases/request-magic-link-command";
import { ValidateMagicLinkQuery } from "./use-cases/validate-magic-link-query";
import { UpdateProfileCommand } from "./use-cases/update-profile-command";
import { UnsubscribeCommand } from "./use-cases/unsubscribe-command";
import { RemoveSubscriberCommand } from "./use-cases/remove-subscriber-command";
import { ListSubscribersQuery } from "./use-cases/list-subscribers-query";
import { SendConfirmationEmailCommand } from "./use-cases/send-confirmation-email-command";
import { SendMagicLinkEmailCommand } from "./use-cases/send-magic-link-email-command";
import { SendEmailChangeConfirmationCommand } from "./use-cases/send-email-change-confirmation-command";
import { SendTestEmailCommand } from "./use-cases/send-test-email-command";
import { Logger } from "./services/logger";
import { AdminAuthService } from "./services/admin-auth-service";

export const DATABASE = Symbol("DATABASE");
export const AWS_CLIENT = Symbol("AWS_CLIENT");
export const AWS_REGION = Symbol("AWS_REGION");
export const FROM_ADDRESS = Symbol("FROM_ADDRESS");
export const BASE_URL = Symbol("BASE_URL");

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

container.register(AWS_REGION, {
  useFactory: () => env.AWS_REGION,
});

container.register(FROM_ADDRESS, {
  useFactory: () => env.FROM_ADDRESS,
});

container.register(BASE_URL, {
  useFactory: () => env.BASE_URL,
});

container.register(EmailSender, {
  useFactory: instanceCachingFactory((c) => {
    return new EmailSender(
      c.resolve(AWS_CLIENT),
      c.resolve(AWS_REGION) as string,
      c.resolve(FROM_ADDRESS) as string,
    );
  }),
});

container.register(NotificationService, {
  useFactory: (c) => {
    return new NotificationService(
      c.resolve(EmailRenderer),
      c.resolve(EmailSender),
    );
  },
});

container.register(SubscriberRepository, {
  useFactory: instanceCachingFactory((c) => {
    return new SubscriberRepository(c.resolve(DATABASE));
  }),
});

container.register(SubscribeCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new SubscribeCommand(c.resolve(SubscriberRepository));
  }),
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

container.register(RequestMagicLinkCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new RequestMagicLinkCommand(c.resolve(SubscriberRepository));
  }),
});

container.register(ValidateMagicLinkQuery, {
  useFactory: instanceCachingFactory((c) => {
    return new ValidateMagicLinkQuery(c.resolve(SubscriberRepository));
  }),
});

container.register(UpdateProfileCommand, {
  useFactory: instanceCachingFactory((c) => {
    return new UpdateProfileCommand(
      c.resolve(SubscriberRepository),
      c.resolve(ValidateMagicLinkQuery),
    );
  }),
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

container.register(SendConfirmationEmailCommand, {
  useFactory: (c) => {
    return new SendConfirmationEmailCommand(
      c.resolve(NotificationService),
      c.resolve(BASE_URL) as string,
    );
  },
});

container.register(SendMagicLinkEmailCommand, {
  useFactory: (c) => {
    return new SendMagicLinkEmailCommand(
      c.resolve(NotificationService),
      c.resolve(BASE_URL) as string,
    );
  },
});

container.register(SendEmailChangeConfirmationCommand, {
  useFactory: (c) => {
    return new SendEmailChangeConfirmationCommand(
      c.resolve(NotificationService),
      c.resolve(BASE_URL) as string,
    );
  },
});

container.register(SendTestEmailCommand, {
  useFactory: (c) => {
    return new SendTestEmailCommand(
      c.resolve(NotificationService),
      c.resolve(BASE_URL) as string,
    );
  },
});

container.registerSingleton(EmailRenderer);
container.registerSingleton(Logger);

container.register(AdminAuthService, {
  useFactory: instanceCachingFactory((c) => {
    return new AdminAuthService(c.resolve(Logger));
  }),
});

export { container };
