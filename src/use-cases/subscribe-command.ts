import type { Subscriber } from "@/entities/subscriber";
import { expiresAt } from "@/lib/expires-at";
import { EMAIL_REGEX } from "@/lib/validation";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import type { IAppConfig } from "./ports/config";

export type SubscribeResult =
  | {
      action: "created" | "resend";
      subscriber: Subscriber;
      confirmationToken: string;
    }
  | { action: "none"; subscriber: Subscriber }
  | { action: "invalid_email" };

export class SubscribeCommand {
  constructor(
    private repo: ISubscriberRepository,
    private config: IAppConfig,
  ) {}

  async execute(email: string, nickname?: string): Promise<SubscribeResult> {
    if (!email || !EMAIL_REGEX.test(email)) {
      return { action: "invalid_email" };
    }

    const existing = await this.repo.findByEmail(email);

    if (existing) {
      if (existing.isActivated) {
        return { subscriber: existing, action: "none" };
      }

      return this.resendConfirmation(existing);
    }

    return this.createSubscriber(email, nickname);
  }

  private async resendConfirmation(
    existing: Subscriber,
  ): Promise<SubscribeResult> {
    const newToken = crypto.randomUUID();
    const tokenExpiresAt = expiresAt(this.config.confirmationTtlMs);
    await this.repo.updateConfirmationToken(
      existing.email,
      newToken,
      tokenExpiresAt,
    );

    return {
      subscriber: existing.withUpdated({
        confirmationToken: newToken,
        confirmationExpiresAt: new Date(tokenExpiresAt),
      }),
      action: "resend",
      confirmationToken: newToken,
    };
  }

  private async createSubscriber(
    email: string,
    nickname?: string,
  ): Promise<SubscribeResult> {
    const unsubscribeToken = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    const confirmationExpiresAt = expiresAt(this.config.confirmationTtlMs);

    const subscriber = await this.repo.create({
      email,
      nickname,
      unsubscribeToken,
      confirmationToken,
      confirmationExpiresAt,
    });

    return { subscriber, action: "created", confirmationToken };
  }
}
