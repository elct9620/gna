import { expiresAt } from "@/lib/expires-at";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import type { IAppConfig } from "./ports/config";

export class RequestMagicLinkCommand {
  constructor(
    private repo: ISubscriberRepository,
    private config: IAppConfig,
  ) {}

  async execute(email: string): Promise<string | null> {
    const subscriber = await this.repo.findByEmail(email);

    if (!subscriber || !subscriber.isActivated) return null;

    const token = crypto.randomUUID();
    const tokenExpiresAt = expiresAt(this.config.magicLinkTtlMs);

    await this.repo.updateMagicLink(subscriber.id, token, tokenExpiresAt);

    return token;
  }
}
