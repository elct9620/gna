import type { IEmailDelivery } from "./ports/email-delivery";
import type { IAppConfig } from "./ports/config";
import { EMAIL_TEMPLATES } from "@/emails/templates";

export class SendTemplateEmailCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private config: IAppConfig,
  ) {}

  async execute(template: string, email: string, token: string): Promise<void> {
    const t = EMAIL_TEMPLATES[template];
    if (!t) throw new Error(`Unknown template: ${template}`);
    await this.emailDelivery.send(email, t.subject, {
      previewText: t.previewText,
      heading: t.heading,
      bodyText: t.bodyText,
      actionUrl: `${this.config.baseUrl}${t.actionPath}?token=${token}`,
      actionText: t.actionText,
    });
  }
}
