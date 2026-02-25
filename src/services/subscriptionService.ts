import { injectable } from "tsyringe";

import { Subscriber, type SubscriberData } from "@/entities/subscriber";

export type SubscribeAction = "created" | "resend" | "none";

export interface SubscribeResult {
  subscriber: Subscriber;
  action: SubscribeAction;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

@injectable()
export class SubscriptionService {
  private subscribers = new Map<string, SubscriberData>();
  private tokenIndex = new Map<string, string>();
  private confirmationTokenIndex = new Map<string, string>();
  private magicLinkTokenIndex = new Map<string, string>();
  private emailConfirmationTokenIndex = new Map<string, string>();

  private toEntity(data: SubscriberData): Subscriber {
    return new Subscriber(data);
  }

  private cleanupTokenIndexes(data: SubscriberData): void {
    if (data.confirmationToken) {
      this.confirmationTokenIndex.delete(data.confirmationToken);
    }
    if (data.magicLinkToken) {
      this.magicLinkTokenIndex.delete(data.magicLinkToken);
    }
    if (data.emailConfirmationToken) {
      this.emailConfirmationTokenIndex.delete(data.emailConfirmationToken);
    }
  }

  subscribe(email: string, nickname?: string): SubscribeResult {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error("Invalid email address");
    }

    const existing = this.subscribers.get(email);
    if (existing) {
      if (existing.activatedAt) {
        return { subscriber: this.toEntity(existing), action: "none" };
      }

      if (existing.confirmationToken) {
        this.confirmationTokenIndex.delete(existing.confirmationToken);
      }
      const newToken = crypto.randomUUID();
      existing.confirmationToken = newToken;
      this.confirmationTokenIndex.set(newToken, email);
      return { subscriber: this.toEntity(existing), action: "resend" };
    }

    const token = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    const data: SubscriberData = {
      email,
      nickname,
      token,
      subscribedAt: new Date(),
      activatedAt: null,
      confirmationToken,
      magicLinkToken: null,
      magicLinkExpiresAt: null,
      pendingEmail: null,
      emailConfirmationToken: null,
    };

    this.subscribers.set(email, data);
    this.tokenIndex.set(token, email);
    this.confirmationTokenIndex.set(confirmationToken, email);

    return { subscriber: this.toEntity(data), action: "created" };
  }

  confirmSubscription(token: string): Subscriber | null {
    const email = this.confirmationTokenIndex.get(token);
    if (!email) return null;

    const data = this.subscribers.get(email);
    if (!data) return null;

    data.activatedAt = new Date();
    this.confirmationTokenIndex.delete(token);
    data.confirmationToken = null;

    return this.toEntity(data);
  }

  requestMagicLink(email: string): string | null {
    const data = this.subscribers.get(email);
    if (!data || !data.activatedAt) return null;

    if (data.magicLinkToken) {
      this.magicLinkTokenIndex.delete(data.magicLinkToken);
    }

    const token = crypto.randomUUID();
    data.magicLinkToken = token;
    data.magicLinkExpiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    this.magicLinkTokenIndex.set(token, email);

    return token;
  }

  validateMagicLink(token: string): Subscriber | null {
    const email = this.magicLinkTokenIndex.get(token);
    if (!email) return null;

    const data = this.subscribers.get(email);
    if (!data) return null;

    if (!data.magicLinkExpiresAt || data.magicLinkExpiresAt < new Date()) {
      this.magicLinkTokenIndex.delete(token);
      data.magicLinkToken = null;
      data.magicLinkExpiresAt = null;
      return null;
    }

    return this.toEntity(data);
  }

  consumeMagicLink(token: string): void {
    const email = this.magicLinkTokenIndex.get(token);
    if (!email) return;

    const data = this.subscribers.get(email);
    if (data) {
      data.magicLinkToken = null;
      data.magicLinkExpiresAt = null;
    }

    this.magicLinkTokenIndex.delete(token);
  }

  updateNickname(email: string, nickname: string): boolean {
    const data = this.subscribers.get(email);
    if (!data) return false;

    data.nickname = nickname;
    return true;
  }

  requestEmailChange(email: string, newEmail: string): string | null {
    const data = this.subscribers.get(email);
    if (!data) return null;

    if (data.emailConfirmationToken) {
      this.emailConfirmationTokenIndex.delete(data.emailConfirmationToken);
    }

    const token = crypto.randomUUID();
    data.pendingEmail = newEmail;
    data.emailConfirmationToken = token;
    this.emailConfirmationTokenIndex.set(token, email);

    return token;
  }

  confirmEmailChange(token: string): Subscriber | null {
    const currentEmail = this.emailConfirmationTokenIndex.get(token);
    if (!currentEmail) return null;

    const data = this.subscribers.get(currentEmail);
    if (!data || !data.pendingEmail) return null;

    const newEmail = data.pendingEmail;

    // Update indexes
    this.subscribers.delete(currentEmail);
    if (data.token) {
      this.tokenIndex.set(data.token, newEmail);
    }
    if (data.magicLinkToken) {
      this.magicLinkTokenIndex.set(data.magicLinkToken, newEmail);
    }

    data.email = newEmail;
    data.pendingEmail = null;
    this.emailConfirmationTokenIndex.delete(token);
    data.emailConfirmationToken = null;

    this.subscribers.set(newEmail, data);

    return this.toEntity(data);
  }

  isEmailTaken(email: string): boolean {
    return this.subscribers.has(email);
  }

  listSubscribers(): Subscriber[] {
    return Array.from(this.subscribers.values()).map((data) =>
      this.toEntity(data),
    );
  }

  removeSubscriber(email: string): boolean {
    const data = this.subscribers.get(email);
    if (!data) {
      return false;
    }

    this.tokenIndex.delete(data.token);
    this.cleanupTokenIndexes(data);
    this.subscribers.delete(email);
    return true;
  }

  unsubscribe(token: string): void {
    const email = this.tokenIndex.get(token);
    if (!email) {
      return;
    }

    const data = this.subscribers.get(email);
    if (data) {
      this.cleanupTokenIndexes(data);
    }

    this.subscribers.delete(email);
    this.tokenIndex.delete(token);
  }
}
