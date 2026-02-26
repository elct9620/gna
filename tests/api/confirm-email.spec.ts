import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { container } from "@/container";
import { EmailSender } from "@/services/email-sender";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { UpdateProfileCommand } from "@/use-cases/update-profile-command";
import { subscribers } from "@/db/schema";
import app from "@/index";
import { MockEmailSender } from "../helpers/mock-email-sender";

describe("GET /confirm", () => {
  let mockEmailSender: MockEmailSender;
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;
  let requestMagicLink: RequestMagicLinkCommand;
  let updateProfile: UpdateProfileCommand;

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
    updateProfile = container.resolve(UpdateProfileCommand);
  });

  it("should redirect to error page when token is missing", async () => {
    const res = await app.request("/confirm", { redirect: "manual" }, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/confirmed?error=");
  });

  it("should redirect on valid subscription confirmation", async () => {
    const { subscriber } = await subscribe.execute("confirm@example.com");

    const res = await app.request(
      `/confirm?token=${subscriber.confirmationToken}`,
      { redirect: "manual" },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/confirmed");
  });

  it("should activate subscriber after confirmation", async () => {
    const { subscriber } = await subscribe.execute("activate@example.com");

    await app.request(
      `/confirm?token=${subscriber.confirmationToken}`,
      { redirect: "manual" },
      env,
    );

    const { ListSubscribersQuery } =
      await import("@/use-cases/list-subscribers-query");
    const listSubscribers = container.resolve(ListSubscribersQuery);
    const list = await listSubscribers.execute();
    const activated = list.find((s) => s.email === "activate@example.com");
    expect(activated?.activatedAt).toBeInstanceOf(Date);
  });

  it("should redirect on valid email change confirmation", async () => {
    const { subscriber } = await subscribe.execute("old@example.com");
    await confirmSubscription.execute(subscriber.confirmationToken!);

    const magicToken = (await requestMagicLink.execute("old@example.com"))!;
    const result = await updateProfile.execute(magicToken, {
      email: "new@example.com",
    });

    const res = await app.request(
      `/confirm?token=${result.emailChangeToken}`,
      { redirect: "manual" },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain(
      "/profile?email_changed=true",
    );
  });

  it("should redirect to error page for invalid token", async () => {
    const res = await app.request(
      "/confirm?token=invalid-token",
      { redirect: "manual" },
      env,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/confirmed?error=");
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

  it("should render error page when error param is present", async () => {
    const res = await app.request("/confirmed?error=invalid_token", {}, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Confirmation Failed");
    expect(html).not.toContain("Welcome!");
  });
});
