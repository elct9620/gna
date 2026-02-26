import { SubscriberRepository } from "@/repository/subscriber-repository";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export class RequestMagicLinkCommand {
  constructor(private repo: SubscriberRepository) {}

  async execute(email: string): Promise<string | null> {
    const row = await this.repo.findByEmail(email);

    if (!row || !row.activatedAt) return null;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();

    await this.repo.updateMagicLink(row.id, token, expiresAt);

    return token;
  }
}
