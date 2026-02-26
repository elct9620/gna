import type { ISubscriberRepository } from "./ports/subscriber-repository";

export class UnsubscribeCommand {
  constructor(private repo: ISubscriberRepository) {}

  async execute(token: string): Promise<void> {
    await this.repo.deleteByUnsubscribeToken(token);
  }
}
