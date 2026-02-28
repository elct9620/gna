import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { container, EMAIL_SENDER } from "@/container";
import { ListSubscribersQuery } from "@/use-cases/list-subscribers-query";
import { subscribers } from "@/db/schema";
import app from "@/index";
import { MockEmailSender } from "../helpers/mock-email-sender";
import { registerAuth } from "../helpers/auth";

describe("GET /admin", () => {
  describe("when DISABLE_AUTH is true", () => {
    beforeEach(() => {
      registerAuth({ disableAuth: true });
    });

    it("should return 200", async () => {
      const res = await app.request("/admin");
      expect(res.status).toBe(200);
    });

    it("should render Admin Dashboard", async () => {
      const res = await app.request("/admin");
      const html = await res.text();
      expect(html).toContain("Admin Dashboard");
    });

    it("should have a page title", async () => {
      const res = await app.request("/admin");
      const html = await res.text();
      expect(html).toContain("<title>Admin Dashboard - Gna</title>");
    });
  });

  describe("when auth is enabled", () => {
    beforeEach(() => {
      registerAuth({
        disableAuth: false,
        teamName: "myteam",
        aud: "test-aud",
      });
    });

    it("should return 401 when JWT header is missing", async () => {
      const res = await app.request("/admin");
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Authentication required" });
    });

    it("should return 403 when JWT is invalid", async () => {
      const res = await app.request("/admin", {
        headers: { "Cf-Access-Jwt-Assertion": "invalid-token" },
      });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Invalid token" });
    });
  });

  describe("when auth config is missing", () => {
    it("should return 500 when CF_ACCESS_TEAM_NAME is not set", async () => {
      registerAuth({ disableAuth: false, teamName: "", aud: "test-aud" });

      const res = await app.request("/admin", {
        headers: { "Cf-Access-Jwt-Assertion": "some-token" },
      });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Server misconfiguration" });
    });

    it("should return 500 when CF_ACCESS_AUD is not set", async () => {
      registerAuth({ disableAuth: false, teamName: "myteam", aud: "" });

      const res = await app.request("/admin", {
        headers: { "Cf-Access-Jwt-Assertion": "some-token" },
      });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Server misconfiguration" });
    });
  });
});

describe("GET /admin/api/subscribers", () => {
  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);

    registerAuth({ disableAuth: true });
    container.register(EMAIL_SENDER, { useValue: new MockEmailSender() });
  });

  it("should return empty subscribers list", async () => {
    const res = await app.request("/admin/api/subscribers");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ subscribers: [] });
  });

  it("should return subscribers after subscribing", async () => {
    await app.request("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", nickname: "Test" }),
    });

    const res = await app.request("/admin/api/subscribers");
    expect(res.status).toBe(200);

    const data = await res.json<{
      subscribers: Array<{
        email: string;
        nickname: string;
        status: string;
      }>;
    }>();
    expect(data.subscribers).toHaveLength(1);
    expect(data.subscribers[0].email).toBe("test@example.com");
    expect(data.subscribers[0].nickname).toBe("Test");
    expect(data.subscribers[0].status).toBeDefined();
  });

  it("should return status 'Pending' for unconfirmed subscriber", async () => {
    await app.request("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "pending@example.com",
        nickname: "Pending",
      }),
    });

    const res = await app.request("/admin/api/subscribers");
    const data = await res.json<{
      subscribers: Array<{ email: string; status: string }>;
    }>();

    const subscriber = data.subscribers.find(
      (s) => s.email === "pending@example.com",
    );
    expect(subscriber?.status).toBe("pending");
  });

  it("should return status 'Activated' for confirmed subscriber", async () => {
    await app.request("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "active@example.com",
        nickname: "Active",
      }),
    });

    const query = container.resolve(ListSubscribersQuery);
    const list = await query.execute();
    const sub = list.find((s) => s.email === "active@example.com");
    const confirmToken = sub!.confirmationToken!;

    await app.request(`/confirm?token=${confirmToken}`);

    const res = await app.request("/admin/api/subscribers");
    const data = await res.json<{
      subscribers: Array<{ email: string; status: string }>;
    }>();

    const subscriber = data.subscribers.find(
      (s) => s.email === "active@example.com",
    );
    expect(subscriber?.status).toBe("activated");
  });
});

describe("DELETE /admin/api/subscribers/:email", () => {
  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);

    registerAuth({ disableAuth: true });
    container.register(EMAIL_SENDER, { useValue: new MockEmailSender() });
  });

  it("should remove an existing subscriber", async () => {
    await app.request("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "remove@example.com" }),
    });

    const res = await app.request("/admin/api/subscribers/remove@example.com", {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Subscriber removed" });

    const listRes = await app.request("/admin/api/subscribers");
    const data = await listRes.json<{
      subscribers: Array<{ email: string }>;
    }>();
    expect(
      data.subscribers.find((s) => s.email === "remove@example.com"),
    ).toBeUndefined();
  });

  it("should return 404 for non-existent subscriber", async () => {
    const res = await app.request(
      "/admin/api/subscribers/nonexistent@example.com",
      { method: "DELETE" },
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Subscriber not found" });
  });

  it("should require admin auth", async () => {
    registerAuth({
      disableAuth: false,
      teamName: "myteam",
      aud: "test-aud",
    });

    const res = await app.request("/admin/api/subscribers/test@example.com", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });
});
