import type { Subscriber } from "@/entities/subscriber";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import { ValidateMagicLinkCommand } from "./validate-magic-link-command";
import { CONFIRMATION_TTL_MS } from "./constants";

export interface UpdateProfileResult {
  error?: "invalid_token" | "email_taken";
  emailChangeToken?: string;
}

export class UpdateProfileCommand {
  constructor(
    private repo: ISubscriberRepository,
    private validateMagicLink: ValidateMagicLinkCommand,
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
        subscriber,
        updates.email,
      );
    }

    return result;
  }

  private async requestEmailChange(
    subscriber: Subscriber,
    newEmail: string,
  ): Promise<string | undefined> {
    if (!subscriber.isActivated) return undefined;

    const changeToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();

    await this.repo.updatePendingEmail(
      subscriber.id,
      newEmail,
      changeToken,
      expiresAt,
    );

    return changeToken;
  }
}
