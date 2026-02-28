import type { Subscriber } from "@/entities/subscriber";
import { EMAIL_REGEX } from "@/lib/validation";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import { CONFIRMATION_TTL_MS } from "./constants";

export type SubscribeAction = "created" | "resend" | "none";

export interface SubscribeResult {
  subscriber: Subscriber;
  action: SubscribeAction;
}

export class SubscribeCommand {
  constructor(private repo: ISubscriberRepository) {}

  async execute(email: string, nickname?: string): Promise<SubscribeResult> {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error("Invalid email address");
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
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();
    await this.repo.updateConfirmationToken(
      existing.email,
      newToken,
      expiresAt,
    );

    return {
      subscriber: existing.withUpdated({
        confirmationToken: newToken,
        confirmationExpiresAt: new Date(expiresAt),
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

    const subscriber = await this.repo.create({
      email,
      nickname,
      unsubscribeToken,
      confirmationToken,
      confirmationExpiresAt,
    });

    return { subscriber, action: "created" };
  }
}
