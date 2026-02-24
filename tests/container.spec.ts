import { describe, it, expect } from "vitest";
import { container, DATABASE } from "@/container";

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
});
