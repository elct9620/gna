import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import type { IAppConfig } from "@/use-cases/ports/config";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { ConfirmEmailChangeCommand } from "@/use-cases/confirm-email-change-command";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { ValidateMagicLinkCommand } from "@/use-cases/validate-magic-link-command";
import { UpdateProfileCommand } from "@/use-cases/update-profile-command";
import { UnsubscribeCommand } from "@/use-cases/unsubscribe-command";
import { RemoveSubscriberCommand } from "@/use-cases/remove-subscriber-command";
import { ListSubscribersQuery } from "@/use-cases/list-subscribers-query";
import { SubscriberRepository } from "@/repository/subscriber-repository";
import { subscribers } from "@/db/schema";

describe("Use Cases", () => {
  let repo: SubscriberRepository;
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;
  let confirmEmailChange: ConfirmEmailChangeCommand;
  let requestMagicLink: RequestMagicLinkCommand;
  let validateMagicLink: ValidateMagicLinkCommand;
  let updateProfile: UpdateProfileCommand;
  let unsubscribe: UnsubscribeCommand;
  let removeSubscriber: RemoveSubscriberCommand;
  let listSubscribers: ListSubscribersQuery;

  const config: IAppConfig = {
    baseUrl: "https://test.example.com",
    confirmationTtlMs: 24 * 60 * 60 * 1000,
    magicLinkTtlMs: 15 * 60 * 1000,
  };

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);
    repo = new SubscriberRepository(db);
    subscribe = new SubscribeCommand(repo, config);
    confirmSubscription = new ConfirmSubscriptionCommand(repo);
    confirmEmailChange = new ConfirmEmailChangeCommand(repo);
    requestMagicLink = new RequestMagicLinkCommand(repo, config);
    validateMagicLink = new ValidateMagicLinkCommand(repo);
    updateProfile = new UpdateProfileCommand(repo, validateMagicLink, config);
    unsubscribe = new UnsubscribeCommand(repo);
    removeSubscriber = new RemoveSubscriberCommand(repo);
    listSubscribers = new ListSubscribersQuery(repo);
  });

  async function createActiveSubscriber(email: string, nickname?: string) {
    const { subscriber } = await subscribe.execute(email, nickname);
    await confirmSubscription.execute(subscriber.confirmationToken!);
    return subscriber;
  }

  describe("SubscribeCommand", () => {
    it("should create a new pending subscriber", async () => {
      const result = await subscribe.execute("test@example.com", "Test");

      expect(result.action).toBe("created");
      expect(result.subscriber.email).toBe("test@example.com");
      expect(result.subscriber.nickname).toBe("Test");
      expect(result.subscriber.isPending).toBe(true);
      expect(result.subscriber.status).toBe("pending");
      expect(result.subscriber.confirmationToken).toBeTruthy();
    });

    it("should resend for duplicate pending subscriber", async () => {
      const first = await subscribe.execute("test@example.com");
      const oldToken = first.subscriber.confirmationToken;

      const second = await subscribe.execute("test@example.com");

      expect(second.action).toBe("resend");
      expect(second.subscriber.confirmationToken).not.toBe(oldToken);
    });

    it("should return none for already active subscriber", async () => {
      await createActiveSubscriber("test@example.com");

      const result = await subscribe.execute("test@example.com");
      expect(result.action).toBe("none");
    });

    it("should throw for invalid email", async () => {
      await expect(subscribe.execute("")).rejects.toThrow(
        "Invalid email address",
      );
      await expect(subscribe.execute("not-an-email")).rejects.toThrow(
        "Invalid email address",
      );
    });
  });

  describe("ConfirmSubscriptionCommand", () => {
    it("should activate a pending subscriber", async () => {
      const { subscriber } = await subscribe.execute("test@example.com");
      const result = await confirmSubscription.execute(
        subscriber.confirmationToken!,
      );

      expect(result).not.toBeNull();
      expect(result!.isActivated).toBe(true);
      expect(result!.status).toBe("activated");
      expect(result!.confirmationToken).toBeNull();
    });

    it("should return null for invalid token", async () => {
      expect(await confirmSubscription.execute("invalid-token")).toBeNull();
    });

    it("should return null if token already consumed", async () => {
      const { subscriber } = await subscribe.execute("test@example.com");
      const token = subscriber.confirmationToken!;
      await confirmSubscription.execute(token);

      expect(await confirmSubscription.execute(token)).toBeNull();
    });

    it("should return null for expired confirmation token", async () => {
      const db = drizzle(env.DB);
      const { subscriber } = await subscribe.execute("test@example.com");
      const token = subscriber.confirmationToken!;

      await db
        .update(subscribers)
        .set({
          confirmationExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        })
        .where(eq(subscribers.confirmationToken, token));

      expect(await confirmSubscription.execute(token)).toBeNull();
    });
  });

  describe("RequestMagicLinkCommand", () => {
    it("should generate a magic link token for active subscriber", async () => {
      await createActiveSubscriber("test@example.com");

      const token = await requestMagicLink.execute("test@example.com");
      expect(token).toBeTruthy();
    });

    it("should return null for inactive subscriber", async () => {
      await subscribe.execute("test@example.com");
      expect(await requestMagicLink.execute("test@example.com")).toBeNull();
    });

    it("should return null for non-existent subscriber", async () => {
      expect(await requestMagicLink.execute("nope@example.com")).toBeNull();
    });

    it("should replace previous magic link token", async () => {
      await createActiveSubscriber("test@example.com");

      const first = await requestMagicLink.execute("test@example.com");
      const second = await requestMagicLink.execute("test@example.com");

      expect(first).not.toBe(second);
      expect(await validateMagicLink.execute(first!)).toBeNull();
      expect(await validateMagicLink.execute(second!)).not.toBeNull();
    });
  });

  describe("ValidateMagicLinkCommand", () => {
    it("should return subscriber for valid token", async () => {
      await createActiveSubscriber("test@example.com");
      const token = (await requestMagicLink.execute("test@example.com"))!;

      const result = await validateMagicLink.execute(token);
      expect(result).not.toBeNull();
      expect(result!.email).toBe("test@example.com");
    });

    it("should return null for expired token", async () => {
      const db = drizzle(env.DB);
      await createActiveSubscriber("test@example.com");
      const token = (await requestMagicLink.execute("test@example.com"))!;

      await db
        .update(subscribers)
        .set({
          magicLinkExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        })
        .where(eq(subscribers.magicLinkToken, token));

      expect(await validateMagicLink.execute(token)).toBeNull();
    });

    it("should return null for invalid token", async () => {
      expect(await validateMagicLink.execute("invalid-token")).toBeNull();
    });

    it("should invalidate the token after consuming", async () => {
      await createActiveSubscriber("test@example.com");
      const token = (await requestMagicLink.execute("test@example.com"))!;

      await repo.clearMagicLinkByToken(token);
      expect(await validateMagicLink.execute(token)).toBeNull();
    });

    it("should do nothing for invalid token when consuming", async () => {
      await expect(
        repo.clearMagicLinkByToken("invalid"),
      ).resolves.not.toThrow();
    });
  });

  describe("UpdateProfileCommand", () => {
    it("should update the nickname", async () => {
      await createActiveSubscriber("test@example.com", "Old");
      const token = (await requestMagicLink.execute("test@example.com"))!;

      const result = await updateProfile.execute(token, { nickname: "New" });

      expect(result.error).toBeUndefined();
      const list = await listSubscribers.execute();
      expect(list[0].nickname).toBe("New");
    });

    it("should set pending email and token", async () => {
      await createActiveSubscriber("old@example.com");
      const token = (await requestMagicLink.execute("old@example.com"))!;

      const result = await updateProfile.execute(token, {
        email: "new@example.com",
      });

      expect(result.emailChangeToken).toBeTruthy();
      const list = await listSubscribers.execute();
      expect(list[0].pendingEmail).toBe("new@example.com");
    });

    it("should return email_taken when new email exists", async () => {
      await createActiveSubscriber("owner@example.com");
      await createActiveSubscriber("changer@example.com");
      const token = (await requestMagicLink.execute("changer@example.com"))!;

      const result = await updateProfile.execute(token, {
        email: "owner@example.com",
      });

      expect(result.error).toBe("email_taken");
    });

    it("should return invalid_token for bad token", async () => {
      const result = await updateProfile.execute("invalid", {
        nickname: "Test",
      });
      expect(result.error).toBe("invalid_token");
    });
  });

  describe("ConfirmEmailChangeCommand", () => {
    async function setupEmailChange(
      oldEmail: string,
      newEmail: string,
    ): Promise<string> {
      await createActiveSubscriber(oldEmail);
      const magicToken = (await requestMagicLink.execute(oldEmail))!;
      const result = await updateProfile.execute(magicToken, {
        email: newEmail,
      });
      return result.emailChangeToken!;
    }

    it("should update the email address", async () => {
      const token = await setupEmailChange(
        "old@example.com",
        "new@example.com",
      );

      const result = await confirmEmailChange.execute(token);

      expect(result).not.toBeNull();
      expect(result!.email).toBe("new@example.com");
      expect(result!.pendingEmail).toBeNull();
      expect(result!.confirmationToken).toBeNull();
    });

    it("should return null for invalid token", async () => {
      expect(await confirmEmailChange.execute("invalid-token")).toBeNull();
    });

    it("should return null for expired confirmation token", async () => {
      const db = drizzle(env.DB);
      const token = await setupEmailChange(
        "old@example.com",
        "new@example.com",
      );

      await db
        .update(subscribers)
        .set({
          confirmationExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        })
        .where(eq(subscribers.confirmationToken, token));

      expect(await confirmEmailChange.execute(token)).toBeNull();
    });

    it("should return null when pending email is already taken", async () => {
      // Set up email change to a free email first
      const token = await setupEmailChange(
        "changer@example.com",
        "taken@example.com",
      );

      // Someone else registers the target email before confirmation (race condition)
      await createActiveSubscriber("taken@example.com");

      expect(await confirmEmailChange.execute(token)).toBeNull();
    });

    it("should update subscriber index", async () => {
      const token = await setupEmailChange(
        "old@example.com",
        "new@example.com",
      );
      await confirmEmailChange.execute(token);

      expect(await repo.existsByEmail("new@example.com")).toBe(true);
      expect(await repo.existsByEmail("old@example.com")).toBe(false);
    });
  });

  describe("UnsubscribeCommand", () => {
    it("should remove subscriber", async () => {
      const sub = await createActiveSubscriber("test@example.com");

      await unsubscribe.execute(sub.unsubscribeToken);

      expect(await listSubscribers.execute()).toHaveLength(0);
      expect(await repo.existsByEmail("test@example.com")).toBe(false);
    });
  });

  describe("RemoveSubscriberCommand", () => {
    it("should remove subscriber", async () => {
      await createActiveSubscriber("test@example.com");

      expect(await removeSubscriber.execute("test@example.com")).toBe(true);
      expect(await listSubscribers.execute()).toHaveLength(0);
    });
  });

  describe("ListSubscribersQuery", () => {
    it("should return empty list when no subscribers", async () => {
      expect(await listSubscribers.execute()).toHaveLength(0);
    });

    it("should return all subscribers", async () => {
      await subscribe.execute("a@example.com");
      await subscribe.execute("b@example.com");

      const list = await listSubscribers.execute();
      expect(list).toHaveLength(2);
    });
  });
});
