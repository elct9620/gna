import { SubscriberRepository } from "@/repository/subscriber-repository";
import { ValidateMagicLinkQuery } from "./validate-magic-link-query";

export interface UpdateProfileResult {
  error?: "invalid_token" | "email_taken";
  emailChangeToken?: string;
}

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

export class UpdateProfileCommand {
  constructor(
    private repo: SubscriberRepository,
    private validateMagicLink: ValidateMagicLinkQuery,
  ) {}

  async execute(
    token: string,
    updates: { nickname?: string; email?: string },
  ): Promise<UpdateProfileResult> {
    const subscriber = await this.validateMagicLink.execute(token);
    if (!subscriber) {
      return { error: "invalid_token" };
    }

    if (updates.email && updates.email !== subscriber.email) {
      if (await this.repo.existsByEmail(updates.email)) {
        return { error: "email_taken" };
      }
    }

    await this.repo.clearMagicLinkByToken(token);

    if (updates.nickname !== undefined) {
      await this.repo.updateNickname(subscriber.email, updates.nickname);
    }

    const result: UpdateProfileResult = {};

    if (updates.email && updates.email !== subscriber.email) {
      result.emailChangeToken = await this.requestEmailChange(
        subscriber.email,
        updates.email,
      );
    }

    return result;
  }

  private async requestEmailChange(
    email: string,
    newEmail: string,
  ): Promise<string | undefined> {
    const row = await this.repo.findByEmail(email);

    if (!row || !row.activatedAt) return undefined;

    const changeToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();

    await this.repo.updatePendingEmail(
      row.id,
      newEmail,
      changeToken,
      expiresAt,
    );

    return changeToken;
  }
}
