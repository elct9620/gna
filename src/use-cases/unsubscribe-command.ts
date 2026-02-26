import { SubscriberRepository } from "@/repository/subscriber-repository";

export class UnsubscribeCommand {
  constructor(private repo: SubscriberRepository) {}

  async execute(token: string): Promise<void> {
    await this.repo.deleteByUnsubscribeToken(token);
  }
}
