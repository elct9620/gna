import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { subscribers } from "@/db/schema";
import { Subscriber } from "@/entities/subscriber";

export type SubscriberRow = typeof subscribers.$inferSelect;

export function toSubscriberEntity(row: SubscriberRow): Subscriber {
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

export class SubscriberRepository {
  constructor(private db: DrizzleD1Database) {}

  async findByEmail(email: string): Promise<SubscriberRow | undefined> {
    return this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .get();
  }

  async findByConfirmationToken(
    token: string,
  ): Promise<SubscriberRow | undefined> {
    return this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.confirmationToken, token))
      .get();
  }

  async findByMagicLinkToken(
    token: string,
  ): Promise<SubscriberRow | undefined> {
    return this.db
      .select()
      .from(subscribers)
      .where(eq(subscribers.magicLinkToken, token))
      .get();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const row = await this.db
      .select({ id: subscribers.id })
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .get();

    return !!row;
  }

  async findAll(): Promise<Subscriber[]> {
    const rows = await this.db.select().from(subscribers).all();
    return rows.map((row) => toSubscriberEntity(row));
  }

  async create(data: {
    email: string;
    nickname?: string;
    unsubscribeToken: string;
    confirmationToken: string;
    confirmationExpiresAt: string;
  }): Promise<SubscriberRow> {
    const [inserted] = await this.db
      .insert(subscribers)
      .values({
        email: data.email,
        nickname: data.nickname ?? null,
        unsubscribeToken: data.unsubscribeToken,
        confirmationToken: data.confirmationToken,
        confirmationExpiresAt: data.confirmationExpiresAt,
      })
      .returning();

    return inserted;
  }

  async updateConfirmationToken(
    email: string,
    token: string,
    expiresAt: string,
  ): Promise<void> {
    await this.db
      .update(subscribers)
      .set({
        confirmationToken: token,
        confirmationExpiresAt: expiresAt,
      })
      .where(eq(subscribers.email, email));
  }

  async activate(id: string, activatedAt: string): Promise<void> {
    await this.db
      .update(subscribers)
      .set({
        activatedAt,
        confirmationToken: null,
        confirmationExpiresAt: null,
      })
      .where(eq(subscribers.id, id));
  }

  async updateMagicLink(
    id: string,
    token: string,
    expiresAt: string,
  ): Promise<void> {
    await this.db
      .update(subscribers)
      .set({
        magicLinkToken: token,
        magicLinkExpiresAt: expiresAt,
      })
      .where(eq(subscribers.id, id));
  }

  async clearMagicLinkById(id: string): Promise<void> {
    await this.db
      .update(subscribers)
      .set({
        magicLinkToken: null,
        magicLinkExpiresAt: null,
      })
      .where(eq(subscribers.id, id));
  }

  async clearMagicLinkByToken(token: string): Promise<void> {
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

  async updatePendingEmail(
    id: string,
    pendingEmail: string,
    token: string,
    expiresAt: string,
  ): Promise<void> {
    await this.db
      .update(subscribers)
      .set({
        pendingEmail,
        confirmationToken: token,
        confirmationExpiresAt: expiresAt,
      })
      .where(eq(subscribers.id, id));
  }

  async commitEmailChange(id: string, newEmail: string): Promise<void> {
    await this.db
      .update(subscribers)
      .set({
        email: newEmail,
        pendingEmail: null,
        confirmationToken: null,
        confirmationExpiresAt: null,
      })
      .where(eq(subscribers.id, id));
  }

  async deleteByEmail(email: string): Promise<boolean> {
    const result = await this.db
      .delete(subscribers)
      .where(eq(subscribers.email, email))
      .returning({ id: subscribers.id });

    return result.length > 0;
  }

  async deleteByUnsubscribeToken(token: string): Promise<void> {
    await this.db
      .delete(subscribers)
      .where(eq(subscribers.unsubscribeToken, token));
  }
}
