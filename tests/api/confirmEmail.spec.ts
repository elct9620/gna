import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { container } from "@/container";
import { EmailSender } from "@/services/emailSender";
import { SubscriptionService } from "@/services/subscriptionService";
import { subscribers } from "@/db/schema";
import app from "@/index";
import { MockEmailSender } from "../helpers/mockEmailSender";

describe("GET /confirm", () => {
  let mockEmailSender: MockEmailSender;

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);

    mockEmailSender = new MockEmailSender();
    container.register(EmailSender, {
      useValue: mockEmailSender as unknown as EmailSender,
    });
  });

  it("should return 400 when token is missing", async () => {
    const res = await app.request("/confirm", {}, env);
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBe("Missing token");
  });

  it("should redirect on valid subscription confirmation", async () => {
    const service = container.resolve(SubscriptionService);
    const { subscriber } = await service.subscribe("confirm@example.com");

    const res = await app.request(
      `/confirm?token=${subscriber.confirmationToken}`,
      { redirect: "manual" },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/confirmed");
  });

  it("should activate subscriber after confirmation", async () => {
    const service = container.resolve(SubscriptionService);
    const { subscriber } = await service.subscribe("activate@example.com");

    await app.request(
      `/confirm?token=${subscriber.confirmationToken}`,
      { redirect: "manual" },
      env,
    );

    const list = await service.listSubscribers();
    const activated = list.find((s) => s.email === "activate@example.com");
    expect(activated?.activatedAt).toBeInstanceOf(Date);
  });

  it("should redirect on valid email change confirmation", async () => {
    const service = container.resolve(SubscriptionService);
    const { subscriber } = await service.subscribe("old@example.com");
    await service.confirmSubscription(subscriber.confirmationToken!);

    const token = await service.requestEmailChange(
      "old@example.com",
      "new@example.com",
    );

    const res = await app.request(
      `/confirm?token=${token}`,
      { redirect: "manual" },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain(
      "/profile?email_changed=true",
    );
  });

  it("should return 400 for invalid token", async () => {
    const res = await app.request("/confirm?token=invalid-token", {}, env);
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBe("Invalid or expired token");
  });
});

describe("GET /confirmed", () => {
  it("should render the confirmed page", async () => {
    const res = await app.request("/confirmed", {}, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Welcome!");
    expect(html).toContain("Subscription Confirmed");
  });
});
