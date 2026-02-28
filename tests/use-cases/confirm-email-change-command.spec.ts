import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import type { IAppConfig } from "@/use-cases/ports/config";
import type { IEmailDelivery } from "@/use-cases/ports/email-delivery";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { ConfirmEmailChangeCommand } from "@/use-cases/confirm-email-change-command";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { ValidateMagicLinkCommand } from "@/use-cases/validate-magic-link-command";
import { UpdateProfileCommand } from "@/use-cases/update-profile-command";
import { SubscriberRepository } from "@/repository/subscriber-repository";
import { subscribers } from "@/db/schema";
import { createActiveSubscriber } from "../helpers/subscriber-factory";

const noopEmailDelivery: IEmailDelivery = {
  send: async () => {},
  sendTemplate: async () => {},
};

describe("ConfirmEmailChangeCommand", () => {
  let repo: SubscriberRepository;
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;
  let confirmEmailChange: ConfirmEmailChangeCommand;
  let requestMagicLink: RequestMagicLinkCommand;
  let updateProfile: UpdateProfileCommand;

  const config: IAppConfig = {
    baseUrl: "https://test.example.com",
    confirmationTtlMs: 24 * 60 * 60 * 1000,
    magicLinkTtlMs: 15 * 60 * 1000,
  };

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);
    repo = new SubscriberRepository(db);
    subscribe = new SubscribeCommand(repo, config, noopEmailDelivery);
    confirmSubscription = new ConfirmSubscriptionCommand(repo);
    confirmEmailChange = new ConfirmEmailChangeCommand(repo);
    requestMagicLink = new RequestMagicLinkCommand(
      repo,
      config,
      noopEmailDelivery,
    );
    const validateMagicLink = new ValidateMagicLinkCommand(repo);
    updateProfile = new UpdateProfileCommand(
      repo,
      validateMagicLink,
      config,
      noopEmailDelivery,
    );
  });

  async function setupEmailChange(
    oldEmail: string,
    newEmail: string,
  ): Promise<string> {
    await createActiveSubscriber(subscribe, confirmSubscription, oldEmail);
    const magicToken = (await requestMagicLink.execute(oldEmail))!;
    await updateProfile.execute(magicToken, { email: newEmail });
    const subscriber = await repo.findByEmail(oldEmail);
    return subscriber!.confirmationToken!;
  }

  it("should return null for expired confirmation token", async () => {
    const db = drizzle(env.DB);
    const token = await setupEmailChange("old@example.com", "new@example.com");

    await db
      .update(subscribers)
      .set({
        confirmationExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      })
      .where(eq(subscribers.confirmationToken, token));

    expect(await confirmEmailChange.execute(token)).toBeNull();
  });

  it("should return null when pending email is already taken", async () => {
    const token = await setupEmailChange(
      "changer@example.com",
      "taken@example.com",
    );

    // Someone else registers the target email before confirmation (race condition)
    await createActiveSubscriber(
      subscribe,
      confirmSubscription,
      "taken@example.com",
    );

    expect(await confirmEmailChange.execute(token)).toBeNull();
  });

  it("should update subscriber index", async () => {
    const token = await setupEmailChange("old@example.com", "new@example.com");
    await confirmEmailChange.execute(token);

    expect(await repo.existsByEmail("new@example.com")).toBe(true);
    expect(await repo.existsByEmail("old@example.com")).toBe(false);
  });
});
