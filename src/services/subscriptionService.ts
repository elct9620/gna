import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { subscribers } from "@/db/schema";
import { Subscriber } from "@/entities/subscriber";

export type SubscribeAction = "created" | "resend" | "none";

export interface SubscribeResult {
  subscriber: Subscriber;
  action: SubscribeAction;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

export class SubscriptionService {
  constructor(private db: DrizzleD1Database) {}

  private toEntity(row: typeof subscribers.$inferSelect): Subscriber {
    return new Subscriber({
      id: row.id,
      email: row.email,
      nickname: row.nickname ?? undefined,
      unsubscribeToken: row.unsubscribeToken,
      createdAt: new Date(row.createdAt),
      activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
      confirmationToken: row.confirmationToken,
      confirmationExpiresAt: row.confirmationExpiresAt
        ? new Date(row.confirmationExpiresAt)
        : null,
      magicLinkToken: row.magicLinkToken,
      magicLinkExpiresAt: row.magicLinkExpiresAt
        ? new Date(row.magicLinkExpiresAt)
        : null,
      pendingEmail: row.pendingEmail,
    });
  }

  async subscribe(email: string, nickname?: string): Promise<SubscribeResult> {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error("Invalid email address");
    }

    const existing = await this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .get();

    if (existing) {
      if (existing.activatedAt) {
        return { subscriber: this.toEntity(existing), action: "none" };
      }

      const newToken = crypto.randomUUID();
      const expiresAt = new Date(
        Date.now() + CONFIRMATION_TTL_MS,
      ).toISOString();
      await this.db
        .update(subscribers)
        .set({
          confirmationToken: newToken,
          confirmationExpiresAt: expiresAt,
        })
        .where(eq(subscribers.email, email));

      return {
        subscriber: this.toEntity({
          ...existing,
          confirmationToken: newToken,
          confirmationExpiresAt: expiresAt,
        }),
        action: "resend",
      };
    }

    const unsubscribeToken = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    const confirmationExpiresAt = new Date(
      Date.now() + CONFIRMATION_TTL_MS,
    ).toISOString();

    const [inserted] = await this.db
      .insert(subscribers)
      .values({
        email,
        nickname: nickname ?? null,
        unsubscribeToken,
        confirmationToken,
        confirmationExpiresAt,
      })
      .returning();

    return { subscriber: this.toEntity(inserted), action: "created" };
  }

  async confirmSubscription(token: string): Promise<Subscriber | null> {
    const row = await this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.confirmationToken, token))
      .get();

    if (!row) return null;
    if (row.activatedAt) return null;

    if (
      row.confirmationExpiresAt &&
      new Date(row.confirmationExpiresAt) < new Date()
    ) {
      return null;
    }

    const now = new Date().toISOString();

    await this.db
      .update(subscribers)
      .set({
        activatedAt: now,
        confirmationToken: null,
        confirmationExpiresAt: null,
      })
      .where(eq(subscribers.id, row.id));

    return this.toEntity({
      ...row,
      activatedAt: now,
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }

  async requestMagicLink(email: string): Promise<string | null> {
    const row = await this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .get();

    if (!row || !row.activatedAt) return null;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();

    await this.db
      .update(subscribers)
      .set({
        magicLinkToken: token,
        magicLinkExpiresAt: expiresAt,
      })
      .where(eq(subscribers.id, row.id));

    return token;
  }

  async validateMagicLink(token: string): Promise<Subscriber | null> {
    const row = await this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.magicLinkToken, token))
      .get();

    if (!row) return null;

    if (
      !row.magicLinkExpiresAt ||
      new Date(row.magicLinkExpiresAt) < new Date()
    ) {
      await this.db
        .update(subscribers)
        .set({
          magicLinkToken: null,
          magicLinkExpiresAt: null,
        })
        .where(eq(subscribers.id, row.id));
      return null;
    }

    return this.toEntity(row);
  }

  async consumeMagicLink(token: string): Promise<void> {
    await this.db
      .update(subscribers)
      .set({
        magicLinkToken: null,
        magicLinkExpiresAt: null,
      })
      .where(eq(subscribers.magicLinkToken, token));
  }

  async updateNickname(email: string, nickname: string): Promise<boolean> {
    const result = await this.db
      .update(subscribers)
      .set({ nickname })
      .where(eq(subscribers.email, email))
      .returning({ id: subscribers.id });

    return result.length > 0;
  }

  async requestEmailChange(
    email: string,
    newEmail: string,
  ): Promise<string | null> {
    const row = await this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .get();

    if (!row) return null;
    if (!row.activatedAt) return null;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();

    await this.db
      .update(subscribers)
      .set({
        pendingEmail: newEmail,
        confirmationToken: token,
        confirmationExpiresAt: expiresAt,
      })
      .where(eq(subscribers.id, row.id));

    return token;
  }

  async confirmEmailChange(token: string): Promise<Subscriber | null> {
    const row = await this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.confirmationToken, token))
      .get();

    if (!row || !row.activatedAt || !row.pendingEmail) return null;

    if (
      row.confirmationExpiresAt &&
      new Date(row.confirmationExpiresAt) < new Date()
    ) {
      return null;
    }

    const newEmail = row.pendingEmail;

    if (await this.isEmailTaken(newEmail)) return null;

    await this.db
      .update(subscribers)
      .set({
        email: newEmail,
        pendingEmail: null,
        confirmationToken: null,
        confirmationExpiresAt: null,
      })
      .where(eq(subscribers.id, row.id));

    return this.toEntity({
      ...row,
      email: newEmail,
      pendingEmail: null,
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const row = await this.db
      .select({ id: subscribers.id })
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .get();

    return !!row;
  }

  async listSubscribers(): Promise<Subscriber[]> {
    const rows = await this.db.select().from(subscribers).all();
    return rows.map((row) => this.toEntity(row));
  }

  async removeSubscriber(email: string): Promise<boolean> {
    const result = await this.db
      .delete(subscribers)
      .where(eq(subscribers.email, email))
      .returning({ id: subscribers.id });

    return result.length > 0;
  }

  async unsubscribe(token: string): Promise<void> {
    await this.db
      .delete(subscribers)
      .where(eq(subscribers.unsubscribeToken, token));
  }
}
