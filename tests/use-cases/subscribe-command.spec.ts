import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import type { IAppConfig } from "@/use-cases/ports/config";
import type { IEmailDelivery } from "@/use-cases/ports/email-delivery";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { SubscriberRepository } from "@/repository/subscriber-repository";
import { subscribers } from "@/db/schema";
import { createActiveSubscriber } from "../helpers/subscriber-factory";

describe("SubscribeCommand", () => {
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;
  let mockEmailDelivery: IEmailDelivery & {
    sendTemplate: ReturnType<typeof vi.fn>;
  };

  const config: IAppConfig = {
    baseUrl: "https://test.example.com",
    confirmationTtlMs: 24 * 60 * 60 * 1000,
    magicLinkTtlMs: 15 * 60 * 1000,
  };

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);
    const repo = new SubscriberRepository(db);
    mockEmailDelivery = {
      send: vi.fn().mockResolvedValue(undefined),
      sendTemplate: vi.fn().mockResolvedValue(undefined),
    };
    subscribe = new SubscribeCommand(repo, config, mockEmailDelivery);
    confirmSubscription = new ConfirmSubscriptionCommand(repo);
  });

  it("should return invalid_email for invalid email address", async () => {
    const result = await subscribe.execute("not-an-email");
    expect(result.action).toBe("invalid_email");
  });

  it("should return invalid_email for empty email", async () => {
    const result = await subscribe.execute("");
    expect(result.action).toBe("invalid_email");
  });

  it("should send confirmation email on new subscription", async () => {
    await subscribe.execute("new@example.com");

    expect(mockEmailDelivery.sendTemplate).toHaveBeenCalledWith(
      "confirmation",
      "new@example.com",
      expect.any(String),
    );
  });

  it("should send confirmation email on resend", async () => {
    await subscribe.execute("resend@example.com");
    mockEmailDelivery.sendTemplate.mockClear();

    await subscribe.execute("resend@example.com");

    expect(mockEmailDelivery.sendTemplate).toHaveBeenCalledWith(
      "confirmation",
      "resend@example.com",
      expect.any(String),
    );
  });

  it("should not send email for invalid email", async () => {
    await subscribe.execute("not-an-email");
    expect(mockEmailDelivery.sendTemplate).not.toHaveBeenCalled();
  });

  it("should return none for already active subscriber", async () => {
    await createActiveSubscriber(
      subscribe,
      confirmSubscription,
      "test@example.com",
    );

    const result = await subscribe.execute("test@example.com");
    expect(result.action).toBe("none");
  });
});
