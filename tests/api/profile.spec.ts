import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { container } from "@/container";
import { EmailSender } from "@/services/emailSender";
import { SubscriptionService } from "@/services/subscriptionService";
import app from "@/index";
import { MockEmailSender } from "../helpers/mockEmailSender";

describe("Profile API", () => {
  let mockEmailSender: MockEmailSender;
  let service: SubscriptionService;

  beforeEach(() => {
    mockEmailSender = new MockEmailSender();
    container.register(EmailSender, {
      useValue: mockEmailSender as unknown as EmailSender,
    });
    service = container.resolve(SubscriptionService);
  });

  function createActiveSubscriber(email: string, nickname?: string) {
    const { subscriber } = service.subscribe(email, nickname);
    service.confirmSubscription(subscriber.confirmationToken!);
    return subscriber;
  }

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
      createActiveSubscriber("active@example.com");

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
      service.subscribe("pending@example.com");

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
      createActiveSubscriber("profile@example.com", "ProfileUser");
      const token = service.requestMagicLink("profile@example.com")!;

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
      createActiveSubscriber("update@example.com", "OldNick");
      const token = service.requestMagicLink("update@example.com")!;

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

      const subscribers = service.listSubscribers();
      const updated = subscribers.find((s) => s.email === "update@example.com");
      expect(updated?.nickname).toBe("NewNick");
    });

    it("should request email change and send confirmation", async () => {
      createActiveSubscriber("current@example.com");
      const token = service.requestMagicLink("current@example.com")!;

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
      createActiveSubscriber("existing@example.com");
      createActiveSubscriber("changer@example.com");
      const token = service.requestMagicLink("changer@example.com")!;

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

    it("should consume the magic link token after use", async () => {
      createActiveSubscriber("consume@example.com");
      const token = service.requestMagicLink("consume@example.com")!;

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
