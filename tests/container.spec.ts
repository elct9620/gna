import { describe, it, expect } from "vitest";
import { container, DATABASE, APP_CONFIG } from "@/container";
import type { AppConfig } from "@/config";

describe("DI Container", () => {
  describe("DATABASE token", () => {
    it("should resolve a Drizzle D1 client", () => {
      const db = container.resolve(DATABASE);
      expect(db).toBeDefined();
    });

    it("should return the same instance on subsequent resolves", () => {
      const db1 = container.resolve(DATABASE);
      const db2 = container.resolve(DATABASE);
      expect(db1).toBe(db2);
    });
  });

  describe("APP_CONFIG token", () => {
    it("should resolve a valid AppConfig", () => {
      const config = container.resolve(APP_CONFIG) as AppConfig;
      expect(config).toBeDefined();
      expect(config.confirmationTtlMs).toBe(24 * 60 * 60 * 1000);
      expect(config.magicLinkTtlMs).toBe(15 * 60 * 1000);
    });

    it("should return the same instance on subsequent resolves", () => {
      const config1 = container.resolve(APP_CONFIG);
      const config2 = container.resolve(APP_CONFIG);
      expect(config1).toBe(config2);
    });
  });
});
