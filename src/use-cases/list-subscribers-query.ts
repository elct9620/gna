import { Subscriber } from "@/entities/subscriber";
import type { ISubscriberRepository } from "./ports/subscriber-repository";

export class ListSubscribersQuery {
  constructor(private repo: ISubscriberRepository) {}

  async execute(): Promise<Subscriber[]> {
    return this.repo.findAll();
  }
}
