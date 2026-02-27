import { describe, it, expect, vi } from "vitest";
import { uuidv7 } from "@/lib/uuidv7";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("should return valid UUID format (8-4-4-4-12)", () => {
    const id = uuidv7();

    expect(id).toMatch(UUID_REGEX);
  });

  it("should set version 7 in the version nibble", () => {
    const id = uuidv7();
    const versionChar = id.replace(/-/g, "").charAt(12);

    expect(versionChar).toBe("7");
  });

  it("should set RFC 4122 variant bits", () => {
    const id = uuidv7();
    const variantChar = id.replace(/-/g, "").charAt(16);

    expect(["8", "9", "a", "b"]).toContain(variantChar);
  });

  it("should encode timestamp in the first 48 bits", () => {
    const fixedTimestamp = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(fixedTimestamp);

    const id = uuidv7();
    const hex = id.replace(/-/g, "");
    const encodedTimestamp = parseInt(hex.slice(0, 12), 16);

    expect(encodedTimestamp).toBe(fixedTimestamp);

    vi.restoreAllMocks();
  });

  it("should generate unique values on consecutive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuidv7()));

    expect(ids.size).toBe(100);
  });

  it("should produce lexicographically sortable IDs over time", () => {
    const timestamp1 = 1700000000000;
    const timestamp2 = 1700000001000;

    vi.spyOn(Date, "now").mockReturnValue(timestamp1);
    const id1 = uuidv7();

    vi.spyOn(Date, "now").mockReturnValue(timestamp2);
    const id2 = uuidv7();

    expect(id1 < id2).toBe(true);

    vi.restoreAllMocks();
  });
});
