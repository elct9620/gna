import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import app from "../src/index";

const authBypass = { ...env, DISABLE_AUTH: "true" };

describe("GET /admin", () => {
  describe("when DISABLE_AUTH is true", () => {
    it("should return 200", async () => {
      const res = await app.request("/admin", {}, authBypass);
      expect(res.status).toBe(200);
    });

    it("should render Admin Dashboard", async () => {
      const res = await app.request("/admin", {}, authBypass);
      const html = await res.text();
      expect(html).toContain("Admin Dashboard");
    });

    it("should have a page title", async () => {
      const res = await app.request("/admin", {}, authBypass);
      const html = await res.text();
      expect(html).toContain("<title>Admin Dashboard - Gna</title>");
    });
  });

  describe("when auth is enabled", () => {
    const authEnv = {
      ...env,
      DISABLE_AUTH: "",
      CF_ACCESS_TEAM_NAME: "myteam",
      CF_ACCESS_AUD: "test-aud",
    };

    it("should return 401 when JWT header is missing", async () => {
      const res = await app.request("/admin", {}, authEnv);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Authentication required" });
    });

    it("should return 403 when JWT is invalid", async () => {
      const res = await app.request(
        "/admin",
        { headers: { "Cf-Access-Jwt-Assertion": "invalid-token" } },
        authEnv,
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Invalid token" });
    });
  });

  describe("when auth config is missing", () => {
    it("should return 500 when CF_ACCESS_TEAM_NAME is not set", async () => {
      const res = await app.request(
        "/admin",
        { headers: { "Cf-Access-Jwt-Assertion": "some-token" } },
        { ...env, DISABLE_AUTH: "", CF_ACCESS_TEAM_NAME: "", CF_ACCESS_AUD: "test-aud" },
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Server misconfiguration" });
    });

    it("should return 500 when CF_ACCESS_AUD is not set", async () => {
      const res = await app.request(
        "/admin",
        { headers: { "Cf-Access-Jwt-Assertion": "some-token" } },
        { ...env, DISABLE_AUTH: "", CF_ACCESS_TEAM_NAME: "myteam", CF_ACCESS_AUD: "" },
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Server misconfiguration" });
    });
  });
});

describe("GET /admin/api/subscribers", () => {
  it("should return empty subscribers list", async () => {
    const res = await app.request("/admin/api/subscribers", {}, authBypass);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ subscribers: [] });
  });

  it("should return subscribers after subscribing", async () => {
    await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", nickname: "Test" }),
      },
      authBypass,
    );

    const res = await app.request("/admin/api/subscribers", {}, authBypass);
    expect(res.status).toBe(200);

    const data = await res.json<{ subscribers: Array<{ email: string; nickname: string; subscribedAt: string }> }>();
    expect(data.subscribers).toHaveLength(1);
    expect(data.subscribers[0].email).toBe("test@example.com");
    expect(data.subscribers[0].nickname).toBe("Test");
    expect(data.subscribers[0].subscribedAt).toBeDefined();
  });
});
