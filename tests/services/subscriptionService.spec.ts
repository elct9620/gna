import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { SubscriptionService } from "@/services/subscriptionService";
import { subscribers } from "@/db/schema";

describe("SubscriptionService", () => {
  let service: SubscriptionService;

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);
    service = new SubscriptionService(db);
  });

  describe("subscribe", () => {
    it("should create a new pending subscriber", async () => {
      const result = await service.subscribe("test@example.com", "Test");

      expect(result.action).toBe("created");
      expect(result.subscriber.email).toBe("test@example.com");
      expect(result.subscriber.nickname).toBe("Test");
      expect(result.subscriber.isPending).toBe(true);
      expect(result.subscriber.status).toBe("pending");
      expect(result.subscriber.confirmationToken).toBeTruthy();
    });

    it("should resend for duplicate pending subscriber", async () => {
      const first = await service.subscribe("test@example.com");
      const oldToken = first.subscriber.confirmationToken;

      const second = await service.subscribe("test@example.com");

      expect(second.action).toBe("resend");
      expect(second.subscriber.confirmationToken).not.toBe(oldToken);
    });

    it("should return none for already active subscriber", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const result = await service.subscribe("test@example.com");
      expect(result.action).toBe("none");
    });

    it("should throw for invalid email", async () => {
      await expect(service.subscribe("")).rejects.toThrow(
        "Invalid email address",
      );
      await expect(service.subscribe("not-an-email")).rejects.toThrow(
        "Invalid email address",
      );
    });
  });

  describe("confirmSubscription", () => {
    it("should activate a pending subscriber", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      const result = await service.confirmSubscription(
        subscriber.confirmationToken!,
      );

      expect(result).not.toBeNull();
      expect(result!.isActivated).toBe(true);
      expect(result!.status).toBe("activated");
      expect(result!.confirmationToken).toBeNull();
    });

    it("should return null for invalid token", async () => {
      expect(await service.confirmSubscription("invalid-token")).toBeNull();
    });

    it("should return null if token already consumed", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      const token = subscriber.confirmationToken!;
      await service.confirmSubscription(token);

      expect(await service.confirmSubscription(token)).toBeNull();
    });

    it("should return null for expired confirmation token", async () => {
      const db = drizzle(env.DB);
      const { subscriber } = await service.subscribe("test@example.com");
      const token = subscriber.confirmationToken!;

      const { eq } = await import("drizzle-orm");
      await db
        .update(subscribers)
        .set({
          confirmationExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        })
        .where(eq(subscribers.confirmationToken, token));

      expect(await service.confirmSubscription(token)).toBeNull();
    });
  });

  describe("requestMagicLink", () => {
    it("should generate a magic link token for active subscriber", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const token = await service.requestMagicLink("test@example.com");
      expect(token).toBeTruthy();
    });

    it("should return null for inactive subscriber", async () => {
      await service.subscribe("test@example.com");
      expect(await service.requestMagicLink("test@example.com")).toBeNull();
    });

    it("should return null for non-existent subscriber", async () => {
      expect(await service.requestMagicLink("nope@example.com")).toBeNull();
    });

    it("should replace previous magic link token", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const first = await service.requestMagicLink("test@example.com");
      const second = await service.requestMagicLink("test@example.com");

      expect(first).not.toBe(second);
      expect(await service.validateMagicLink(first!)).toBeNull();
      expect(await service.validateMagicLink(second!)).not.toBeNull();
    });
  });

  describe("validateMagicLink", () => {
    it("should return subscriber for valid token", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);
      const token = (await service.requestMagicLink("test@example.com"))!;

      const result = await service.validateMagicLink(token);
      expect(result).not.toBeNull();
      expect(result!.email).toBe("test@example.com");
    });

    it("should return null for expired token", async () => {
      const db = drizzle(env.DB);
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);
      const token = (await service.requestMagicLink("test@example.com"))!;

      // Directly update the DB to set an expired timestamp
      const { eq } = await import("drizzle-orm");
      await db
        .update(subscribers)
        .set({
          magicLinkExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        })
        .where(eq(subscribers.magicLinkToken, token));

      expect(await service.validateMagicLink(token)).toBeNull();
    });

    it("should return null for invalid token", async () => {
      expect(await service.validateMagicLink("invalid-token")).toBeNull();
    });
  });

  describe("consumeMagicLink", () => {
    it("should invalidate the token", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);
      const token = (await service.requestMagicLink("test@example.com"))!;

      await service.consumeMagicLink(token);
      expect(await service.validateMagicLink(token)).toBeNull();
    });

    it("should do nothing for invalid token", async () => {
      await expect(service.consumeMagicLink("invalid")).resolves.not.toThrow();
    });
  });

  describe("updateNickname", () => {
    it("should update the nickname", async () => {
      await service.subscribe("test@example.com", "Old");
      const updated = await service.updateNickname("test@example.com", "New");

      expect(updated).toBe(true);
      const list = await service.listSubscribers();
      expect(list[0].nickname).toBe("New");
    });

    it("should return false for non-existent subscriber", async () => {
      expect(await service.updateNickname("nope@example.com", "Name")).toBe(
        false,
      );
    });
  });

  describe("requestEmailChange", () => {
    it("should set pending email and token", async () => {
      const { subscriber } = await service.subscribe("old@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const token = await service.requestEmailChange(
        "old@example.com",
        "new@example.com",
      );

      expect(token).toBeTruthy();
      const list = await service.listSubscribers();
      expect(list[0].pendingEmail).toBe("new@example.com");
    });

    it("should return null for non-existent subscriber", async () => {
      expect(
        await service.requestEmailChange("nope@example.com", "new@example.com"),
      ).toBeNull();
    });

    it("should return null for pending subscriber", async () => {
      await service.subscribe("old@example.com");

      expect(
        await service.requestEmailChange("old@example.com", "new@example.com"),
      ).toBeNull();
    });

    it("should replace previous email confirmation token", async () => {
      const { subscriber } = await service.subscribe("old@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const first = await service.requestEmailChange(
        "old@example.com",
        "new1@example.com",
      );
      const second = await service.requestEmailChange(
        "old@example.com",
        "new2@example.com",
      );

      expect(first).not.toBe(second);
      expect(await service.confirmEmailChange(first!)).toBeNull();
    });
  });

  describe("confirmEmailChange", () => {
    it("should update the email address", async () => {
      const { subscriber } = await service.subscribe("old@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const token = (await service.requestEmailChange(
        "old@example.com",
        "new@example.com",
      ))!;

      const result = await service.confirmEmailChange(token);

      expect(result).not.toBeNull();
      expect(result!.email).toBe("new@example.com");
      expect(result!.pendingEmail).toBeNull();
      expect(result!.confirmationToken).toBeNull();
    });

    it("should return null for invalid token", async () => {
      expect(await service.confirmEmailChange("invalid-token")).toBeNull();
    });

    it("should return null for expired confirmation token", async () => {
      const db = drizzle(env.DB);
      const { subscriber } = await service.subscribe("old@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const token = (await service.requestEmailChange(
        "old@example.com",
        "new@example.com",
      ))!;

      const { eq } = await import("drizzle-orm");
      await db
        .update(subscribers)
        .set({
          confirmationExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        })
        .where(eq(subscribers.confirmationToken, token));

      expect(await service.confirmEmailChange(token)).toBeNull();
    });

    it("should return null when pending email is already taken", async () => {
      const { subscriber: sub1 } = await service.subscribe("owner@example.com");
      await service.confirmSubscription(sub1.confirmationToken!);

      const { subscriber: sub2 } = await service.subscribe(
        "changer@example.com",
      );
      await service.confirmSubscription(sub2.confirmationToken!);

      const token = (await service.requestEmailChange(
        "changer@example.com",
        "owner@example.com",
      ))!;

      expect(await service.confirmEmailChange(token)).toBeNull();
    });

    it("should update subscriber index", async () => {
      const { subscriber } = await service.subscribe("old@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);

      const token = (await service.requestEmailChange(
        "old@example.com",
        "new@example.com",
      ))!;
      await service.confirmEmailChange(token);

      expect(await service.isEmailTaken("new@example.com")).toBe(true);
      expect(await service.isEmailTaken("old@example.com")).toBe(false);
    });
  });

  describe("isEmailTaken", () => {
    it("should return true for existing email", async () => {
      await service.subscribe("test@example.com");
      expect(await service.isEmailTaken("test@example.com")).toBe(true);
    });

    it("should return false for non-existing email", async () => {
      expect(await service.isEmailTaken("nope@example.com")).toBe(false);
    });
  });

  describe("unsubscribe", () => {
    it("should remove subscriber", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);
      await service.requestMagicLink("test@example.com");
      await service.requestEmailChange("test@example.com", "new@example.com");

      await service.unsubscribe(subscriber.unsubscribeToken);

      expect(await service.listSubscribers()).toHaveLength(0);
      expect(await service.isEmailTaken("test@example.com")).toBe(false);
    });
  });

  describe("removeSubscriber", () => {
    it("should remove subscriber", async () => {
      const { subscriber } = await service.subscribe("test@example.com");
      await service.confirmSubscription(subscriber.confirmationToken!);
      await service.requestMagicLink("test@example.com");

      expect(await service.removeSubscriber("test@example.com")).toBe(true);
      expect(await service.listSubscribers()).toHaveLength(0);
    });
  });
});
