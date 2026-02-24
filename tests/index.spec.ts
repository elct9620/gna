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
    expect(html).toContain("Subscribe to Newsletter");
  });

  it("should have a page title", async () => {
    const res = await app.request("/", {}, env);
    const html = await res.text();
    expect(html).toContain("<title>Gna Newsletter</title>");
  });

  it("should contain hydration data", async () => {
    const res = await app.request("/", {}, env);
    const html = await res.text();
    expect(html).toContain("__staticRouterHydrationData");
  });
});

describe("GET /nonexistent", () => {
  it("should return 404", async () => {
    const res = await app.request("/nonexistent", {}, env);
    expect(res.status).toBe(404);
  });

  it("should render not found page", async () => {
    const res = await app.request("/nonexistent", {}, env);
    const html = await res.text();
    expect(html).toContain("Page Not Found");
  });

  it("should have a page title", async () => {
    const res = await app.request("/nonexistent", {}, env);
    const html = await res.text();
    expect(html).toContain("<title>Page Not Found - Gna</title>");
  });
});
