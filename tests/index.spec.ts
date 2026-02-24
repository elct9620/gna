import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("GET /", () => {
  it("should return 200", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
  });

  it("should render content", async () => {
    const res = await app.request("/", {}, env);
    const html = await res.text();
    expect(html).toContain("Hello!");
  });
});
