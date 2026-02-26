import { Subscriber } from "@/entities/subscriber";
import {
  SubscriberRepository,
  toSubscriberEntity,
} from "@/repository/subscriber-repository";

export class ConfirmSubscriptionCommand {
  constructor(private repo: SubscriberRepository) {}

  async execute(token: string): Promise<Subscriber | null> {
    const row = await this.repo.findByConfirmationToken(token);

    if (!row) return null;
    if (row.activatedAt) return null;

    const subscriber = toSubscriberEntity(row);
    if (subscriber.isConfirmationExpired) return null;

    const now = new Date().toISOString();

    await this.repo.activate(row.id, now);

    return toSubscriberEntity({
      ...row,
      activatedAt: now,
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }
}
