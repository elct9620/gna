import type { Subscriber } from "@/entities/subscriber";
import { expiresAt } from "@/lib/expires-at";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import type { IMagicLinkValidator } from "./ports/magic-link-validator";
import type { IAppConfig } from "./ports/config";

export interface UpdateProfileResult {
  error?: "invalid_token" | "email_taken";
  emailChangeToken?: string;
}

export class UpdateProfileCommand {
  constructor(
    private repo: ISubscriberRepository,
    private validateMagicLink: IMagicLinkValidator,
    private config: IAppConfig,
  ) {}

  async execute(
    token: string,
    updates: { nickname?: string; email?: string },
  ): Promise<UpdateProfileResult> {
    const subscriber = await this.validateMagicLink.execute(token);
    if (!subscriber) {
      return { error: "invalid_token" };
    }

    const newEmail = updates.email;
    const isEmailChanging =
      newEmail !== undefined && subscriber.isEmailDifferent(newEmail);

    if (isEmailChanging) {
      if (await this.repo.existsByEmail(newEmail)) {
        return { error: "email_taken" };
      }
    }

    await this.repo.clearMagicLinkByToken(token);

    if (updates.nickname !== undefined) {
      await this.repo.updateNickname(subscriber.email, updates.nickname);
    }

    const result: UpdateProfileResult = {};

    if (isEmailChanging) {
      result.emailChangeToken = await this.requestEmailChange(
        subscriber,
        newEmail,
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
    const tokenExpiresAt = expiresAt(this.config.confirmationTtlMs);

    await this.repo.updatePendingEmail(
      subscriber.id,
      newEmail,
      changeToken,
      tokenExpiresAt,
    );

    return changeToken;
  }
}
