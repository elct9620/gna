import { container, instanceCachingFactory } from "tsyringe";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";

export const DATABASE = Symbol("DATABASE");

container.register(DATABASE, {
  useFactory: instanceCachingFactory(() => drizzle(env.DB)),
});

export { container };
