import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import type { IAppConfig } from "@/use-cases/ports/config";
import type { IEmailDelivery } from "@/use-cases/ports/email-delivery";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { SubscriberRepository } from "@/repository/subscriber-repository";
import { subscribers } from "@/db/schema";

const noopEmailDelivery: IEmailDelivery = {
  send: async () => {},
  sendTemplate: async () => {},
};

describe("ConfirmSubscriptionCommand", () => {
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;

  const config: IAppConfig = {
    baseUrl: "https://test.example.com",
    confirmationTtlMs: 24 * 60 * 60 * 1000,
    magicLinkTtlMs: 15 * 60 * 1000,
  };

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);
    const repo = new SubscriberRepository(db);
    subscribe = new SubscribeCommand(repo, config, noopEmailDelivery);
    confirmSubscription = new ConfirmSubscriptionCommand(repo);
  });

  it("should return null if token already consumed", async () => {
    const result = await subscribe.execute("test@example.com");
    expect(result.action).not.toBe("invalid_email");
    if (result.action === "invalid_email") return;
    const token = result.subscriber.confirmationToken!;
    await confirmSubscription.execute(token);

    expect(await confirmSubscription.execute(token)).toBeNull();
  });

  it("should return null for expired confirmation token", async () => {
    const db = drizzle(env.DB);
    const result = await subscribe.execute("test@example.com");
    expect(result.action).not.toBe("invalid_email");
    if (result.action === "invalid_email") return;
    const token = result.subscriber.confirmationToken!;

    await db
      .update(subscribers)
      .set({
        confirmationExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      })
      .where(eq(subscribers.confirmationToken, token));

    expect(await confirmSubscription.execute(token)).toBeNull();
  });
});
