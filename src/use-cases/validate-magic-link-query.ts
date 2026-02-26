import { Subscriber } from "@/entities/subscriber";
import type { ISubscriberRepository } from "./ports/subscriber-repository";

export class ValidateMagicLinkQuery {
  constructor(private repo: ISubscriberRepository) {}

  async execute(token: string): Promise<Subscriber | null> {
    const subscriber = await this.repo.findByMagicLinkToken(token);

    if (!subscriber) return null;

    if (subscriber.isMagicLinkExpired) {
      await this.repo.clearMagicLinkById(subscriber.id);
      return null;
    }

    return subscriber;
  }
}
