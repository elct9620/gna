import path from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      tslib: path.resolve(import.meta.dirname, "node_modules/tslib/tslib.es6.mjs"),
    },
  },
  test: {
    deps: {
      optimizer: {
        ssr: {
          include: [
            "react-remove-scroll",
            "react-remove-scroll-bar",
            "reflect-metadata",
            "tsyringe",
          ],
        },
      },
    },
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
    coverage: {
      provider: "istanbul",
    },
  },
});
