import type { Subscriber } from "@/entities/subscriber";
import type { ISubscriberRepository } from "./ports/subscriber-repository";

export class ConfirmSubscriptionCommand {
  constructor(private repo: ISubscriberRepository) {}

  async execute(token: string): Promise<Subscriber | null> {
    const subscriber = await this.repo.findByConfirmationToken(token);

    if (!subscriber) return null;
    if (subscriber.isActivated) return null;
    if (subscriber.isConfirmationExpired) return null;

    const now = new Date().toISOString();

    await this.repo.activate(subscriber.id, now);

    return subscriber.withUpdated({
      activatedAt: new Date(now),
      confirmationToken: null,
      confirmationExpiresAt: null,
    });
  }
}
