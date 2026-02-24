import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("GET /api/unsubscribe", () => {
  it("should return 400 when token is missing", async () => {
    const res = await app.request("/api/unsubscribe", {}, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("should redirect with 302 when token is not found (idempotent)", async () => {
    const res = await app.request(
      "/api/unsubscribe?token=nonexistent",
      { redirect: "manual" },
      env,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain(
      "/unsubscribe?status=success",
    );
  });
});

describe("GET /unsubscribe", () => {
  it("should return 200 and render the unsubscribe page", async () => {
    const res = await app.request("/unsubscribe", {}, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Unsubscribe");
  });

  it("should have a page title", async () => {
    const res = await app.request("/unsubscribe", {}, env);
    const html = await res.text();
    expect(html).toContain("<title>Unsubscribe - Gna</title>");
  });
});
