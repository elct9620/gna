import { Subscriber } from "@/entities/subscriber";
import { EMAIL_REGEX } from "@/lib/validation";
import {
  SubscriberRepository,
  toSubscriberEntity,
  type SubscriberRow,
} from "@/repository/subscriber-repository";

export type SubscribeAction = "created" | "resend" | "none";

export interface SubscribeResult {
  subscriber: Subscriber;
  action: SubscribeAction;
}

export interface UpdateProfileResult {
  error?: "invalid_token" | "email_taken";
  emailChangeToken?: string;
}

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

export class SubscriptionService {
  constructor(private repo: SubscriberRepository) {}

  private isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date();
  }

  async subscribe(email: string, nickname?: string): Promise<SubscribeResult> {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error("Invalid email address");
    }

    const existing = await this.repo.findByEmail(email);

    if (existing) {
      if (existing.activatedAt) {
        return { subscriber: toSubscriberEntity(existing), action: "none" };
      }

      return this.resendConfirmation(existing);
    }

    return this.createSubscriber(email, nickname);
  }

  private async resendConfirmation(
    existing: SubscriberRow,
  ): Promise<SubscribeResult> {
    const newToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();
    await this.repo.updateConfirmationToken(
      existing.email,
      newToken,
      expiresAt,
    );

    return {
      subscriber: toSubscriberEntity({
        ...existing,
        confirmationToken: newToken,
        confirmationExpiresAt: expiresAt,
      }),
      action: "resend",
    };
  }

  private async createSubscriber(
    email: string,
    nickname?: string,
  ): Promise<SubscribeResult> {
    const unsubscribeToken = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    const confirmationExpiresAt = new Date(
      Date.now() + CONFIRMATION_TTL_MS,
    ).toISOString();

    const inserted = await this.repo.create({
      email,
      nickname,
      unsubscribeToken,
      confirmationToken,
      confirmationExpiresAt,
    });

    return { subscriber: toSubscriberEntity(inserted), action: "created" };
  }

  async confirmSubscription(token: string): Promise<Subscriber | null> {
    const row = await this.repo.findByConfirmationToken(token);

    if (!row) return null;
    if (row.activatedAt) return null;

    if (this.isExpired(row.confirmationExpiresAt)) return null;

    const now = new Date().toISOString();

    await this.repo.activate(row.id, now);

    return toSubscriberEntity({
      ...row,
      activatedAt: now,
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }

  async requestMagicLink(email: string): Promise<string | null> {
    const row = await this.repo.findByEmail(email);

    if (!row || !row.activatedAt) return null;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();

    await this.repo.updateMagicLink(row.id, token, expiresAt);

    return token;
  }

  async validateMagicLink(token: string): Promise<Subscriber | null> {
    const row = await this.repo.findByMagicLinkToken(token);

    if (!row) return null;

    if (this.isExpired(row.magicLinkExpiresAt)) {
      await this.repo.clearMagicLinkById(row.id);
      return null;
    }

    return toSubscriberEntity(row);
  }

  async consumeMagicLink(token: string): Promise<void> {
    await this.repo.clearMagicLinkByToken(token);
  }

  async updateProfile(
    token: string,
    updates: { nickname?: string; email?: string },
  ): Promise<UpdateProfileResult> {
    const subscriber = await this.validateMagicLink(token);
    if (!subscriber) {
      return { error: "invalid_token" };
    }

    if (updates.email && updates.email !== subscriber.email) {
      if (await this.isEmailTaken(updates.email)) {
        return { error: "email_taken" };
      }
    }

    await this.consumeMagicLink(token);

    if (updates.nickname !== undefined) {
      await this.updateNickname(subscriber.email, updates.nickname);
    }

    const result: UpdateProfileResult = {};

    if (updates.email && updates.email !== subscriber.email) {
      result.emailChangeToken = (await this.requestEmailChange(
        subscriber.email,
        updates.email,
      ))!;
    }

    return result;
  }

  async updateNickname(email: string, nickname: string): Promise<boolean> {
    return this.repo.updateNickname(email, nickname);
  }

  async requestEmailChange(
    email: string,
    newEmail: string,
  ): Promise<string | null> {
    const row = await this.repo.findByEmail(email);

    if (!row) return null;
    if (!row.activatedAt) return null;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();

    await this.repo.updatePendingEmail(row.id, newEmail, token, expiresAt);

    return token;
  }

  async confirmEmailChange(token: string): Promise<Subscriber | null> {
    const row = await this.repo.findByConfirmationToken(token);

    if (!row || !row.activatedAt || !row.pendingEmail) return null;

    if (this.isExpired(row.confirmationExpiresAt)) return null;

    const newEmail = row.pendingEmail;

    if (await this.isEmailTaken(newEmail)) return null;

    await this.repo.commitEmailChange(row.id, newEmail);

    return toSubscriberEntity({
      ...row,
      email: newEmail,
      pendingEmail: null,
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    return this.repo.existsByEmail(email);
  }

  async listSubscribers(): Promise<Subscriber[]> {
    return this.repo.findAll();
  }

  async removeSubscriber(email: string): Promise<boolean> {
    return this.repo.deleteByEmail(email);
  }

  async unsubscribe(token: string): Promise<void> {
    await this.repo.deleteByUnsubscribeToken(token);
  }
}
