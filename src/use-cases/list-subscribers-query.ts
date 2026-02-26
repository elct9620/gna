import { Subscriber } from "@/entities/subscriber";
import { SubscriberRepository } from "@/repository/subscriber-repository";

export class ListSubscribersQuery {
  constructor(private repo: SubscriberRepository) {}

  async execute(): Promise<Subscriber[]> {
    return this.repo.findAll();
  }
}
