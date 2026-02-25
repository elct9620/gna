import { container, instanceCachingFactory } from "tsyringe";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import { SubscriptionService } from "./services/subscriptionService";
import { EmailRenderer } from "./services/emailRenderer";

export const DATABASE = Symbol("DATABASE");

container.register(DATABASE, {
  useFactory: instanceCachingFactory(() => drizzle(env.DB)),
});

container.registerSingleton(SubscriptionService);
container.registerSingleton(EmailRenderer);

export { container };
