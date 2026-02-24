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

  unsubscribe(token: string): void {
    const email = this.tokenIndex.get(token);
    if (!email) {
      return;
    }

    this.subscribers.delete(email);
    this.tokenIndex.delete(token);
  }
}
