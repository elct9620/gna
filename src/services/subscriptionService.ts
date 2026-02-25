import { injectable } from "tsyringe";

export interface Subscriber {
  email: string;
  nickname?: string;
  token: string;
  subscribedAt: Date;
  activatedAt: Date | null;
  confirmationToken: string | null;
  magicLinkToken: string | null;
  magicLinkExpiresAt: Date | null;
  pendingEmail: string | null;
  emailConfirmationToken: string | null;
}

export type SubscribeAction = "created" | "resend" | "none";

export interface SubscribeResult {
  subscriber: Subscriber;
  action: SubscribeAction;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

@injectable()
export class SubscriptionService {
  private subscribers = new Map<string, Subscriber>();
  private tokenIndex = new Map<string, string>();
  private confirmationTokenIndex = new Map<string, string>();
  private magicLinkTokenIndex = new Map<string, string>();
  private emailConfirmationTokenIndex = new Map<string, string>();

  subscribe(email: string, nickname?: string): SubscribeResult {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error("Invalid email address");
    }

    const existing = this.subscribers.get(email);
    if (existing) {
      if (existing.activatedAt) {
        return { subscriber: existing, action: "none" };
      }

      if (existing.confirmationToken) {
        this.confirmationTokenIndex.delete(existing.confirmationToken);
      }
      const newToken = crypto.randomUUID();
      existing.confirmationToken = newToken;
      this.confirmationTokenIndex.set(newToken, email);
      return { subscriber: existing, action: "resend" };
    }

    const token = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    const subscriber: Subscriber = {
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

    this.subscribers.set(email, subscriber);
    this.tokenIndex.set(token, email);
    this.confirmationTokenIndex.set(confirmationToken, email);

    return { subscriber, action: "created" };
  }

  confirmSubscription(token: string): Subscriber | null {
    const email = this.confirmationTokenIndex.get(token);
    if (!email) return null;

    const subscriber = this.subscribers.get(email);
    if (!subscriber) return null;

    subscriber.activatedAt = new Date();
    this.confirmationTokenIndex.delete(token);
    subscriber.confirmationToken = null;

    return subscriber;
  }

  requestMagicLink(email: string): string | null {
    const subscriber = this.subscribers.get(email);
    if (!subscriber || !subscriber.activatedAt) return null;

    if (subscriber.magicLinkToken) {
      this.magicLinkTokenIndex.delete(subscriber.magicLinkToken);
    }

    const token = crypto.randomUUID();
    subscriber.magicLinkToken = token;
    subscriber.magicLinkExpiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    this.magicLinkTokenIndex.set(token, email);

    return token;
  }

  validateMagicLink(token: string): Subscriber | null {
    const email = this.magicLinkTokenIndex.get(token);
    if (!email) return null;

    const subscriber = this.subscribers.get(email);
    if (!subscriber) return null;

    if (
      !subscriber.magicLinkExpiresAt ||
      subscriber.magicLinkExpiresAt < new Date()
    ) {
      this.magicLinkTokenIndex.delete(token);
      subscriber.magicLinkToken = null;
      subscriber.magicLinkExpiresAt = null;
      return null;
    }

    return subscriber;
  }

  consumeMagicLink(token: string): void {
    const email = this.magicLinkTokenIndex.get(token);
    if (!email) return;

    const subscriber = this.subscribers.get(email);
    if (subscriber) {
      subscriber.magicLinkToken = null;
      subscriber.magicLinkExpiresAt = null;
    }

    this.magicLinkTokenIndex.delete(token);
  }

  updateNickname(email: string, nickname: string): boolean {
    const subscriber = this.subscribers.get(email);
    if (!subscriber) return false;

    subscriber.nickname = nickname;
    return true;
  }

  requestEmailChange(email: string, newEmail: string): string | null {
    const subscriber = this.subscribers.get(email);
    if (!subscriber) return null;

    if (subscriber.emailConfirmationToken) {
      this.emailConfirmationTokenIndex.delete(
        subscriber.emailConfirmationToken,
      );
    }

    const token = crypto.randomUUID();
    subscriber.pendingEmail = newEmail;
    subscriber.emailConfirmationToken = token;
    this.emailConfirmationTokenIndex.set(token, email);

    return token;
  }

  confirmEmailChange(token: string): Subscriber | null {
    const currentEmail = this.emailConfirmationTokenIndex.get(token);
    if (!currentEmail) return null;

    const subscriber = this.subscribers.get(currentEmail);
    if (!subscriber || !subscriber.pendingEmail) return null;

    const newEmail = subscriber.pendingEmail;

    // Update indexes
    this.subscribers.delete(currentEmail);
    if (subscriber.token) {
      this.tokenIndex.set(subscriber.token, newEmail);
    }
    if (subscriber.magicLinkToken) {
      this.magicLinkTokenIndex.set(subscriber.magicLinkToken, newEmail);
    }

    subscriber.email = newEmail;
    subscriber.pendingEmail = null;
    this.emailConfirmationTokenIndex.delete(token);
    subscriber.emailConfirmationToken = null;

    this.subscribers.set(newEmail, subscriber);

    return subscriber;
  }

  isEmailTaken(email: string): boolean {
    return this.subscribers.has(email);
  }

  listSubscribers(): Subscriber[] {
    return Array.from(this.subscribers.values());
  }

  removeSubscriber(email: string): boolean {
    const subscriber = this.subscribers.get(email);
    if (!subscriber) {
      return false;
    }

    this.tokenIndex.delete(subscriber.token);
    if (subscriber.confirmationToken) {
      this.confirmationTokenIndex.delete(subscriber.confirmationToken);
    }
    if (subscriber.magicLinkToken) {
      this.magicLinkTokenIndex.delete(subscriber.magicLinkToken);
    }
    if (subscriber.emailConfirmationToken) {
      this.emailConfirmationTokenIndex.delete(
        subscriber.emailConfirmationToken,
      );
    }
    this.subscribers.delete(email);
    return true;
  }

  unsubscribe(token: string): void {
    const email = this.tokenIndex.get(token);
    if (!email) {
      return;
    }

    const subscriber = this.subscribers.get(email);
    if (subscriber) {
      if (subscriber.confirmationToken) {
        this.confirmationTokenIndex.delete(subscriber.confirmationToken);
      }
      if (subscriber.magicLinkToken) {
        this.magicLinkTokenIndex.delete(subscriber.magicLinkToken);
      }
      if (subscriber.emailConfirmationToken) {
        this.emailConfirmationTokenIndex.delete(
          subscriber.emailConfirmationToken,
        );
      }
    }

    this.subscribers.delete(email);
    this.tokenIndex.delete(token);
  }
}
