import { expiresAt } from "@/lib/expires-at";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import type { IAppConfig } from "./ports/config";
import type { SendTemplateEmailCommand } from "./send-template-email-command";

export class RequestMagicLinkCommand {
  constructor(
    private repo: ISubscriberRepository,
    private config: IAppConfig,
    private sendEmail: SendTemplateEmailCommand,
  ) {}

  async execute(email: string): Promise<string | null> {
    const subscriber = await this.repo.findByEmail(email);

    if (!subscriber || !subscriber.isActivated) return null;

    const token = crypto.randomUUID();
    const tokenExpiresAt = expiresAt(this.config.magicLinkTtlMs);

    await this.repo.updateMagicLink(subscriber.id, token, tokenExpiresAt);
    await this.sendEmail.execute("magic_link", email, token);

    return token;
  }
}
