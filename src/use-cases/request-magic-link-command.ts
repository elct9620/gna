import type { ISubscriberRepository } from "./ports/subscriber-repository";
import { MAGIC_LINK_TTL_MS } from "./constants";

export class RequestMagicLinkCommand {
  constructor(private repo: ISubscriberRepository) {}

  async execute(email: string): Promise<string | null> {
    const subscriber = await this.repo.findByEmail(email);

    if (!subscriber || !subscriber.isActivated) return null;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();

    await this.repo.updateMagicLink(subscriber.id, token, expiresAt);

    return token;
  }
}
