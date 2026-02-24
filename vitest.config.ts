import path from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
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
      },
    },
    coverage: {
      provider: "istanbul",
    },
  },
});
