import { injectable } from "tsyringe";

export interface Subscriber {
  email: string;
  nickname?: string;
  token: string;
  subscribedAt: Date;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@injectable()
export class SubscriptionService {
  private subscribers = new Map<string, Subscriber>();
  private tokenIndex = new Map<string, string>();

  subscribe(email: string, nickname?: string): Subscriber {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error("Invalid email address");
    }

    const existing = this.subscribers.get(email);
    if (existing) {
      return existing;
    }

    const token = crypto.randomUUID();
    const subscriber: Subscriber = {
      email,
      nickname,
      token,
      subscribedAt: new Date(),
    };

    this.subscribers.set(email, subscriber);
    this.tokenIndex.set(token, email);

    return subscriber;
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
    this.subscribers.delete(email);
    return true;
  }

  unsubscribe(token: string): void {
    const email = this.tokenIndex.get(token);
    if (!email) {
      return;
    }

    this.subscribers.delete(email);
    this.tokenIndex.delete(token);
  }
}
