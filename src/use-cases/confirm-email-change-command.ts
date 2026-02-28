import type { Subscriber } from "@/entities/subscriber";
import type { ISubscriberRepository } from "./ports/subscriber-repository";

export class ConfirmEmailChangeCommand {
  constructor(private repo: ISubscriberRepository) {}

  async execute(token: string): Promise<Subscriber | null> {
    const subscriber = await this.repo.findByConfirmationToken(token);

    if (!subscriber || !subscriber.isActivated || !subscriber.pendingEmail)
      return null;
    if (subscriber.isConfirmationExpired) return null;

    const newEmail = subscriber.pendingEmail;

    if (await this.repo.existsByEmail(newEmail)) return null;

    await this.repo.commitEmailChange(subscriber.id, newEmail);

    return subscriber.withUpdated({
      email: newEmail,
      pendingEmail: null,
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }
}
