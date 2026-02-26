import { container, instanceCachingFactory } from "tsyringe";
import { drizzle } from "drizzle-orm/d1";
import { AwsClient } from "aws4fetch";
import { env } from "cloudflare:workers";
import { SubscriberRepository } from "./repository/subscriberRepository";
import { SubscriptionService } from "./services/subscriptionService";
import { EmailRenderer } from "./services/emailRenderer";
import { EmailSender } from "./services/emailSender";
import { NotificationService } from "./services/notificationService";

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
      c.resolve(BASE_URL) as string,
    );
  },
});

container.register(SubscriberRepository, {
  useFactory: instanceCachingFactory((c) => {
    return new SubscriberRepository(c.resolve(DATABASE));
  }),
});

container.register(SubscriptionService, {
  useFactory: instanceCachingFactory((c) => {
    return new SubscriptionService(c.resolve(SubscriberRepository));
  }),
});
container.registerSingleton(EmailRenderer);

export { container };
