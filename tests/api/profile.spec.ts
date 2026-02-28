import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { container } from "@/container";
import { EmailSender } from "@/services/email-sender";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { ListSubscribersQuery } from "@/use-cases/list-subscribers-query";
import { subscribers } from "@/db/schema";
import app from "@/index";
import { MockEmailSender } from "../helpers/mock-email-sender";
import { createActiveSubscriber } from "../helpers/subscriber-factory";

describe("Profile API", () => {
  let mockEmailSender: MockEmailSender;
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;
  let requestMagicLink: RequestMagicLinkCommand;
  let listSubscribers: ListSubscribersQuery;

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);

    mockEmailSender = new MockEmailSender();
    container.register(EmailSender, {
      useValue: mockEmailSender as unknown as EmailSender,
    });
    subscribe = container.resolve(SubscribeCommand);
    confirmSubscription = container.resolve(ConfirmSubscriptionCommand);
    requestMagicLink = container.resolve(RequestMagicLinkCommand);
    listSubscribers = container.resolve(ListSubscribersQuery);
  });

  describe("POST /api/profile/request-link", () => {
    it("should return 200 regardless of email existence", async () => {
      const res = await app.request(
        "/api/profile/request-link",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "nonexistent@example.com" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json<{ status: string }>();
      expect(body.status).toBe("link_sent");
      expect(mockEmailSender.sentEmails).toHaveLength(0);
    });

    it("should send magic link email for active subscriber", async () => {
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "active@example.com",
      );
      mockEmailSender.reset();

      const res = await app.request(
        "/api/profile/request-link",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "active@example.com" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      expect(mockEmailSender.sentEmails).toHaveLength(1);
      expect(mockEmailSender.sentEmails[0].subject).toBe(
        "Your profile access link",
      );
    });

    it("should not send magic link for pending subscriber", async () => {
      await subscribe.execute("pending@example.com");
      mockEmailSender.reset();

      await app.request(
        "/api/profile/request-link",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "pending@example.com" }),
        },
        env,
      );

      expect(mockEmailSender.sentEmails).toHaveLength(0);
    });
  });

  describe("GET /api/profile", () => {
    it("should return 401 when token is missing", async () => {
      const res = await app.request("/api/profile", {}, env);
      expect(res.status).toBe(401);
    });

    it("should return 401 for invalid token", async () => {
      const res = await app.request("/api/profile?token=invalid", {}, env);
      expect(res.status).toBe(401);
    });

    it("should return subscriber data for valid token", async () => {
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "profile@example.com",
        "ProfileUser",
      );
      const token = (await requestMagicLink.execute("profile@example.com"))!;

      const res = await app.request(`/api/profile?token=${token}`, {}, env);

      expect(res.status).toBe(200);
      const body = await res.json<{ email: string; nickname: string }>();
      expect(body.email).toBe("profile@example.com");
      expect(body.nickname).toBe("ProfileUser");
    });
  });

  describe("POST /api/profile/update", () => {
    it("should return 401 when token is missing", async () => {
      const res = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env,
      );
      expect(res.status).toBe(401);
    });

    it("should return 401 for invalid token", async () => {
      const res = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "invalid" }),
        },
        env,
      );
      expect(res.status).toBe(401);
    });

    it("should update nickname", async () => {
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "update@example.com",
        "OldNick",
      );
      const token = (await requestMagicLink.execute("update@example.com"))!;

      const res = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nickname: "NewNick" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json<{ status: string }>();
      expect(body.status).toBe("updated");

      const list = await listSubscribers.execute();
      const updated = list.find((s) => s.email === "update@example.com");
      expect(updated?.nickname).toBe("NewNick");
    });

    it("should request email change and send confirmation", async () => {
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "current@example.com",
      );
      const token = (await requestMagicLink.execute("current@example.com"))!;
      mockEmailSender.reset();

      const res = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email: "newemail@example.com" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      expect(mockEmailSender.sentEmails).toHaveLength(1);
      expect(mockEmailSender.sentEmails[0].to).toEqual([
        "newemail@example.com",
      ]);
      expect(mockEmailSender.sentEmails[0].subject).toBe(
        "Confirm your email change",
      );
    });

    it("should return 409 when new email is already taken", async () => {
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "existing@example.com",
      );
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "changer@example.com",
      );
      const token = (await requestMagicLink.execute("changer@example.com"))!;

      const res = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email: "existing@example.com" }),
        },
        env,
      );

      expect(res.status).toBe(409);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("Email already in use");
    });

    it("should not consume token when returning 409", async () => {
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "existing@example.com",
      );
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "changer@example.com",
      );
      const token = (await requestMagicLink.execute("changer@example.com"))!;

      const res = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email: "existing@example.com" }),
        },
        env,
      );
      expect(res.status).toBe(409);

      // Token should still be valid after 409
      const retryRes = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nickname: "StillWorks" }),
        },
        env,
      );
      expect(retryRes.status).toBe(200);
    });

    it("should consume the magic link token after use", async () => {
      await createActiveSubscriber(
        subscribe,
        confirmSubscription,
        "consume@example.com",
      );
      const token = (await requestMagicLink.execute("consume@example.com"))!;

      await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nickname: "Updated" }),
        },
        env,
      );

      // Token should be consumed - second use should fail
      const res = await app.request(
        "/api/profile/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nickname: "Again" }),
        },
        env,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /profile (SSR)", () => {
    it("should return 200 and render the profile page", async () => {
      const res = await app.request("/profile", {}, env);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("Subscriber Profile");
    });

    it("should have a page title", async () => {
      const res = await app.request("/profile", {}, env);
      const html = await res.text();
      expect(html).toContain("<title>Profile - Gna</title>");
    });
  });
});
