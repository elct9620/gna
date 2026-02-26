import { Subscriber } from "@/entities/subscriber";
import {
  SubscriberRepository,
  toSubscriberEntity,
} from "@/repository/subscriber-repository";

export class ValidateMagicLinkQuery {
  constructor(private repo: SubscriberRepository) {}

  async execute(token: string): Promise<Subscriber | null> {
    const row = await this.repo.findByMagicLinkToken(token);

    if (!row) return null;

    const subscriber = toSubscriberEntity(row);
    if (subscriber.isMagicLinkExpired) {
      await this.repo.clearMagicLinkById(row.id);
      return null;
    }

    return subscriber;
  }
}
