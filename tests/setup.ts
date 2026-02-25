import "reflect-metadata";
import { env, applyD1Migrations, type D1Migration } from "cloudflare:test";
import { beforeAll } from "vitest";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
