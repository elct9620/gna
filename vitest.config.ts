import path from "node:path";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrationsPath = path.resolve(import.meta.dirname, "./drizzle");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    test: {
      setupFiles: ["./tests/setup.ts"],
      deps: {
        optimizer: {
          ssr: {
            include: ["react-remove-scroll", "react-remove-scroll-bar"],
          },
        },
      },
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          singleWorker: true,
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
            },
          },
        },
      },
      coverage: {
        enabled: true,
        provider: "istanbul",
        exclude: ["src/components/ui/**"],
      },
    },
  };
});
