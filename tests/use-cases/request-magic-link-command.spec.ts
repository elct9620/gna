import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import type { IAppConfig } from "@/use-cases/ports/config";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import type { SendTemplateEmailCommand } from "@/use-cases/send-template-email-command";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { ValidateMagicLinkCommand } from "@/use-cases/validate-magic-link-command";
import { SubscriberRepository } from "@/repository/subscriber-repository";
import { subscribers } from "@/db/schema";
import { createActiveSubscriber } from "../helpers/subscriber-factory";

const noopSendEmail = {
  execute: async () => ({ success: true as const }),
} as unknown as SendTemplateEmailCommand;

describe("RequestMagicLinkCommand", () => {
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
    subscribe = new SubscribeCommand(repo, config, noopSendEmail);
    confirmSubscription = new ConfirmSubscriptionCommand(repo);
    requestMagicLink = new RequestMagicLinkCommand(repo, config, noopSendEmail);
    validateMagicLink = new ValidateMagicLinkCommand(repo);
  });

  it("should replace previous magic link token", async () => {
    await createActiveSubscriber(
      subscribe,
      confirmSubscription,
      "test@example.com",
    );

    const first = await requestMagicLink.execute("test@example.com");
    const second = await requestMagicLink.execute("test@example.com");

    expect(first).not.toBe(second);
    expect(await validateMagicLink.execute(first!)).toBeNull();
    expect(await validateMagicLink.execute(second!)).not.toBeNull();
  });
});
