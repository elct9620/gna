import { Subscriber } from "@/entities/subscriber";
import {
  SubscriberRepository,
  toSubscriberEntity,
} from "@/repository/subscriber-repository";

export class ConfirmEmailChangeCommand {
  constructor(private repo: SubscriberRepository) {}

  async execute(token: string): Promise<Subscriber | null> {
    const row = await this.repo.findByConfirmationToken(token);

    if (!row || !row.activatedAt || !row.pendingEmail) return null;

    const subscriber = toSubscriberEntity(row);
    if (subscriber.isConfirmationExpired) return null;

    const newEmail = row.pendingEmail;

    if (await this.repo.existsByEmail(newEmail)) return null;

    await this.repo.commitEmailChange(row.id, newEmail);

    return toSubscriberEntity({
      ...row,
      email: newEmail,
      pendingEmail: null,
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }
}
