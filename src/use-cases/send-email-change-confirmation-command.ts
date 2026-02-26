import type { IEmailDelivery } from "./ports/email-delivery";
import { EMAIL_TEMPLATES } from "@/emails/templates";

export class SendEmailChangeConfirmationCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private baseUrl: string,
  ) {}

  async execute(email: string, emailConfirmationToken: string): Promise<void> {
    const t = EMAIL_TEMPLATES.email_change;
    await this.emailDelivery.send(email, t.subject, {
      previewText: t.previewText,
      heading: t.heading,
      bodyText: t.bodyText,
      actionUrl: `${this.baseUrl}${t.actionPath}?token=${emailConfirmationToken}`,
      actionText: t.actionText,
    });
  }
}
