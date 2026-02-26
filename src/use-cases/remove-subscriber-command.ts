import type { ISubscriberRepository } from "./ports/subscriber-repository";

export class RemoveSubscriberCommand {
  constructor(private repo: ISubscriberRepository) {}

  async execute(email: string): Promise<boolean> {
    return this.repo.deleteByEmail(email);
  }
}
