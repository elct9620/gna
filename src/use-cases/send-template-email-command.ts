import type { IEmailDelivery } from "./ports/email-delivery";
import { EMAIL_TEMPLATES } from "@/emails/templates";

export class SendTemplateEmailCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private baseUrl: string,
  ) {}

  async execute(template: string, email: string, token: string): Promise<void> {
    const t = EMAIL_TEMPLATES[template];
    if (!t) throw new Error(`Unknown template: ${template}`);
    await this.emailDelivery.send(email, t.subject, {
      previewText: t.previewText,
      heading: t.heading,
      bodyText: t.bodyText,
      actionUrl: `${this.baseUrl}${t.actionPath}?token=${token}`,
      actionText: t.actionText,
    });
  }
}
