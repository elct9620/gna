import type { IEmailDelivery } from "./ports/email-delivery";
import { EMAIL_TEMPLATES } from "@/emails/templates";

export class SendMagicLinkEmailCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private baseUrl: string,
  ) {}

  async execute(email: string, magicLinkToken: string): Promise<void> {
    const t = EMAIL_TEMPLATES.magic_link;
    await this.emailDelivery.send(email, t.subject, {
      previewText: t.previewText,
      heading: t.heading,
      bodyText: t.bodyText,
      actionUrl: `${this.baseUrl}${t.actionPath}?token=${magicLinkToken}`,
      actionText: t.actionText,
    });
  }
}
