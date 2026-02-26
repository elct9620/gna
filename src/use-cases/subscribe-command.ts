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

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

export class SubscribeCommand {
  constructor(private repo: SubscriberRepository) {}

  async execute(email: string, nickname?: string): Promise<SubscribeResult> {
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
}
