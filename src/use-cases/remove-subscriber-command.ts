import { SubscriberRepository } from "@/repository/subscriber-repository";

export class RemoveSubscriberCommand {
  constructor(private repo: SubscriberRepository) {}

  async execute(email: string): Promise<boolean> {
    return this.repo.deleteByEmail(email);
  }
}
