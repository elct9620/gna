import type { IEmailDelivery } from "./ports/email-delivery";
import { EMAIL_TEMPLATES } from "@/emails/templates";
import { EMAIL_REGEX } from "@/lib/validation";

export class SendTestEmailCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private baseUrl: string,
  ) {}

  async execute(template: string, to: string): Promise<void> {
    if (!EMAIL_REGEX.test(to)) {
      throw new Error("Invalid email address");
    }

    const config = EMAIL_TEMPLATES[template];
    if (!config) {
      throw new Error(`Unknown template: ${template}`);
    }

    await this.emailDelivery.send(to, `[TEST] ${config.subject}`, {
      previewText: config.previewText,
      heading: config.heading,
      bodyText: config.bodyText,
      actionUrl: `${this.baseUrl}${config.actionPath}?token=test-token-example`,
      actionText: config.actionText,
    });
  }
}
