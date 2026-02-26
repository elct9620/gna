import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import {
  SubscriberRepository,
  toSubscriberEntity,
} from "@/repository/subscriberRepository";
import { subscribers } from "@/db/schema";

describe("SubscriberRepository", () => {
  let repo: SubscriberRepository;

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);
    repo = new SubscriberRepository(db);
  });

  async function createActiveSubscriber(
    email = "test@example.com",
    nickname?: string,
  ) {
    const row = await repo.create({
      email,
      nickname,
      unsubscribeToken: crypto.randomUUID(),
      confirmationToken: crypto.randomUUID(),
      confirmationExpiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
    await repo.activate(row.id, new Date().toISOString());
    return row;
  }

  describe("toSubscriberEntity", () => {
    it("should convert a row to a Subscriber entity", async () => {
      const row = await repo.create({
        email: "test@example.com",
        nickname: "Test",
        unsubscribeToken: "unsub-token",
        confirmationToken: "conf-token",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const entity = toSubscriberEntity(row);

      expect(entity.email).toBe("test@example.com");
      expect(entity.nickname).toBe("Test");
      expect(entity.unsubscribeToken).toBe("unsub-token");
      expect(entity.isPending).toBe(true);
    });

    it("should handle null nickname", async () => {
      const row = await repo.create({
        email: "test@example.com",
        unsubscribeToken: "unsub-token",
        confirmationToken: "conf-token",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const entity = toSubscriberEntity(row);
      expect(entity.nickname).toBeUndefined();
    });
  });

  describe("findByEmail", () => {
    it("should return a row for existing email", async () => {
      await repo.create({
        email: "test@example.com",
        unsubscribeToken: "t1",
        confirmationToken: "c1",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const row = await repo.findByEmail("test@example.com");
      expect(row).toBeDefined();
      expect(row!.email).toBe("test@example.com");
    });

    it("should return undefined for non-existing email", async () => {
      const row = await repo.findByEmail("nope@example.com");
      expect(row).toBeUndefined();
    });
  });

  describe("findByConfirmationToken", () => {
    it("should return a row for valid token", async () => {
      await repo.create({
        email: "test@example.com",
        unsubscribeToken: "t1",
        confirmationToken: "my-token",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const row = await repo.findByConfirmationToken("my-token");
      expect(row).toBeDefined();
      expect(row!.confirmationToken).toBe("my-token");
    });

    it("should return undefined for invalid token", async () => {
      const row = await repo.findByConfirmationToken("invalid");
      expect(row).toBeUndefined();
    });
  });

  describe("findByMagicLinkToken", () => {
    it("should return a row for valid token", async () => {
      const created = await createActiveSubscriber();
      await repo.updateMagicLink(
        created.id,
        "magic-token",
        new Date().toISOString(),
      );

      const row = await repo.findByMagicLinkToken("magic-token");
      expect(row).toBeDefined();
      expect(row!.magicLinkToken).toBe("magic-token");
    });

    it("should return undefined for invalid token", async () => {
      const row = await repo.findByMagicLinkToken("invalid");
      expect(row).toBeUndefined();
    });
  });

  describe("existsByEmail", () => {
    it("should return true for existing email", async () => {
      await repo.create({
        email: "test@example.com",
        unsubscribeToken: "t1",
        confirmationToken: "c1",
        confirmationExpiresAt: new Date().toISOString(),
      });

      expect(await repo.existsByEmail("test@example.com")).toBe(true);
    });

    it("should return false for non-existing email", async () => {
      expect(await repo.existsByEmail("nope@example.com")).toBe(false);
    });
  });

  describe("findAll", () => {
    it("should return all subscribers as entities", async () => {
      await repo.create({
        email: "a@example.com",
        unsubscribeToken: "t1",
        confirmationToken: "c1",
        confirmationExpiresAt: new Date().toISOString(),
      });
      await repo.create({
        email: "b@example.com",
        unsubscribeToken: "t2",
        confirmationToken: "c2",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const all = await repo.findAll();
      expect(all).toHaveLength(2);
      expect(all[0].email).toBeDefined();
    });

    it("should return empty array when no subscribers", async () => {
      const all = await repo.findAll();
      expect(all).toHaveLength(0);
    });
  });

  describe("create", () => {
    it("should insert and return a row", async () => {
      const row = await repo.create({
        email: "test@example.com",
        nickname: "Nick",
        unsubscribeToken: "unsub",
        confirmationToken: "conf",
        confirmationExpiresAt: new Date().toISOString(),
      });

      expect(row.id).toBeTruthy();
      expect(row.email).toBe("test@example.com");
      expect(row.nickname).toBe("Nick");
    });

    it("should set nickname to null when omitted", async () => {
      const row = await repo.create({
        email: "test@example.com",
        unsubscribeToken: "unsub",
        confirmationToken: "conf",
        confirmationExpiresAt: new Date().toISOString(),
      });

      expect(row.nickname).toBeNull();
    });
  });

  describe("updateConfirmationToken", () => {
    it("should update confirmation fields", async () => {
      await repo.create({
        email: "test@example.com",
        unsubscribeToken: "t1",
        confirmationToken: "old-token",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const newExpiry = new Date().toISOString();
      await repo.updateConfirmationToken(
        "test@example.com",
        "new-token",
        newExpiry,
      );

      const row = await repo.findByEmail("test@example.com");
      expect(row!.confirmationToken).toBe("new-token");
      expect(row!.confirmationExpiresAt).toBe(newExpiry);
    });
  });

  describe("activate", () => {
    it("should set activatedAt and clear confirmation fields", async () => {
      const created = await repo.create({
        email: "test@example.com",
        unsubscribeToken: "t1",
        confirmationToken: "c1",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const now = new Date().toISOString();
      await repo.activate(created.id, now);

      const row = await repo.findByEmail("test@example.com");
      expect(row!.activatedAt).toBe(now);
      expect(row!.confirmationToken).toBeNull();
      expect(row!.confirmationExpiresAt).toBeNull();
    });
  });

  describe("updateMagicLink", () => {
    it("should set magic link fields", async () => {
      const created = await createActiveSubscriber();

      const expiresAt = new Date().toISOString();
      await repo.updateMagicLink(created.id, "magic", expiresAt);

      const row = await repo.findByEmail("test@example.com");
      expect(row!.magicLinkToken).toBe("magic");
      expect(row!.magicLinkExpiresAt).toBe(expiresAt);
    });
  });

  describe("clearMagicLinkById", () => {
    it("should clear magic link fields", async () => {
      const created = await createActiveSubscriber();
      await repo.updateMagicLink(created.id, "magic", new Date().toISOString());

      await repo.clearMagicLinkById(created.id);

      const row = await repo.findByEmail("test@example.com");
      expect(row!.magicLinkToken).toBeNull();
      expect(row!.magicLinkExpiresAt).toBeNull();
    });
  });

  describe("clearMagicLinkByToken", () => {
    it("should clear magic link fields by token", async () => {
      const created = await createActiveSubscriber();
      await repo.updateMagicLink(created.id, "magic", new Date().toISOString());

      await repo.clearMagicLinkByToken("magic");

      const row = await repo.findByEmail("test@example.com");
      expect(row!.magicLinkToken).toBeNull();
    });
  });

  describe("updateNickname", () => {
    it("should update nickname and return true", async () => {
      await repo.create({
        email: "test@example.com",
        nickname: "Old",
        unsubscribeToken: "t1",
        confirmationToken: "c1",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const result = await repo.updateNickname("test@example.com", "New");
      expect(result).toBe(true);

      const row = await repo.findByEmail("test@example.com");
      expect(row!.nickname).toBe("New");
    });

    it("should return false for non-existent email", async () => {
      const result = await repo.updateNickname("nope@example.com", "Name");
      expect(result).toBe(false);
    });
  });

  describe("updatePendingEmail", () => {
    it("should set pending email fields", async () => {
      const created = await createActiveSubscriber();
      const expiresAt = new Date().toISOString();

      await repo.updatePendingEmail(
        created.id,
        "new@example.com",
        "token",
        expiresAt,
      );

      const row = await repo.findByEmail("test@example.com");
      expect(row!.pendingEmail).toBe("new@example.com");
      expect(row!.confirmationToken).toBe("token");
      expect(row!.confirmationExpiresAt).toBe(expiresAt);
    });
  });

  describe("commitEmailChange", () => {
    it("should update email and clear pending fields", async () => {
      const created = await createActiveSubscriber();
      await repo.updatePendingEmail(
        created.id,
        "new@example.com",
        "token",
        new Date().toISOString(),
      );

      await repo.commitEmailChange(created.id, "new@example.com");

      const old = await repo.findByEmail("test@example.com");
      expect(old).toBeUndefined();

      const updated = await repo.findByEmail("new@example.com");
      expect(updated).toBeDefined();
      expect(updated!.pendingEmail).toBeNull();
      expect(updated!.confirmationToken).toBeNull();
      expect(updated!.confirmationExpiresAt).toBeNull();
    });
  });

  describe("deleteByEmail", () => {
    it("should delete and return true", async () => {
      await repo.create({
        email: "test@example.com",
        unsubscribeToken: "t1",
        confirmationToken: "c1",
        confirmationExpiresAt: new Date().toISOString(),
      });

      const result = await repo.deleteByEmail("test@example.com");
      expect(result).toBe(true);

      const row = await repo.findByEmail("test@example.com");
      expect(row).toBeUndefined();
    });

    it("should return false for non-existent email", async () => {
      const result = await repo.deleteByEmail("nope@example.com");
      expect(result).toBe(false);
    });
  });

  describe("deleteByUnsubscribeToken", () => {
    it("should delete subscriber by unsubscribe token", async () => {
      await repo.create({
        email: "test@example.com",
        unsubscribeToken: "unsub-token",
        confirmationToken: "c1",
        confirmationExpiresAt: new Date().toISOString(),
      });

      await repo.deleteByUnsubscribeToken("unsub-token");

      const row = await repo.findByEmail("test@example.com");
      expect(row).toBeUndefined();
    });
  });
});
