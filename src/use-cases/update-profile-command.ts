import type { Subscriber } from "@/entities/subscriber";
import { expiresAt } from "@/lib/expires-at";
import type { ISubscriberRepository } from "./ports/subscriber-repository";
import type { IMagicLinkValidator } from "./ports/magic-link-validator";
import type { IAppConfig } from "./ports/config";
import type { SendTemplateEmailCommand } from "./send-template-email-command";

export interface UpdateProfileResult {
  error?: "invalid_token" | "email_taken";
}

export class UpdateProfileCommand {
  constructor(
    private repo: ISubscriberRepository,
    private validateMagicLink: IMagicLinkValidator,
    private config: IAppConfig,
    private sendEmail: SendTemplateEmailCommand,
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

    if (isEmailChanging) {
      await this.requestEmailChange(subscriber, newEmail);
    }

    return {};
  }

  private async requestEmailChange(
    subscriber: Subscriber,
    newEmail: string,
  ): Promise<void> {
    if (!subscriber.isActivated) return;

    const changeToken = crypto.randomUUID();
    const tokenExpiresAt = expiresAt(this.config.confirmationTtlMs);

    await this.repo.updatePendingEmail(
      subscriber.id,
      newEmail,
      changeToken,
      tokenExpiresAt,
    );

    await this.sendEmail.execute("email_change", newEmail, changeToken);
  }
}
