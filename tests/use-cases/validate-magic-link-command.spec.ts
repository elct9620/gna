import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import type { IAppConfig } from "@/use-cases/ports/config";
import type { IEmailDelivery } from "@/use-cases/ports/email-delivery";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { ValidateMagicLinkCommand } from "@/use-cases/validate-magic-link-command";
import { SubscriberRepository } from "@/repository/subscriber-repository";
import { subscribers } from "@/db/schema";
import { createActiveSubscriber } from "../helpers/subscriber-factory";

const noopEmailDelivery: IEmailDelivery = {
  send: async () => {},
  sendTemplate: async () => {},
};

describe("ValidateMagicLinkCommand", () => {
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;
  let requestMagicLink: RequestMagicLinkCommand;
  let validateMagicLink: ValidateMagicLinkCommand;

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
    requestMagicLink = new RequestMagicLinkCommand(
      repo,
      config,
      noopEmailDelivery,
    );
    validateMagicLink = new ValidateMagicLinkCommand(repo);
  });

  it("should return null for expired token", async () => {
    const db = drizzle(env.DB);
    await createActiveSubscriber(
      subscribe,
      confirmSubscription,
      "test@example.com",
    );
    const token = (await requestMagicLink.execute("test@example.com"))!;

    await db
      .update(subscribers)
      .set({
        magicLinkExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      })
      .where(eq(subscribers.magicLinkToken, token));

    expect(await validateMagicLink.execute(token)).toBeNull();
  });
});
