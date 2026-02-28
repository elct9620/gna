import { Subscriber } from "@/entities/subscriber";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import type { IMagicLinkValidator } from "./ports/magic-link-validator";

export class ValidateMagicLinkCommand implements IMagicLinkValidator {
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
