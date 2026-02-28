import type { IEmailDelivery } from "./ports/email-delivery";
import type { IAppConfig } from "./ports/config";
import { EMAIL_TEMPLATES, buildEmailContent } from "@/emails/templates";
import { EMAIL_REGEX } from "@/lib/validation";

export type SendTestEmailResult =
  | { success: true }
  | { success: false; error: "invalid_email" | "unknown_template" };

export class SendTestEmailCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private config: IAppConfig,
  ) {}

  async execute(template: string, to: string): Promise<SendTestEmailResult> {
    if (!EMAIL_REGEX.test(to)) {
      return { success: false, error: "invalid_email" };
    }

    const tmpl = EMAIL_TEMPLATES[template];
    if (!tmpl) {
      return { success: false, error: "unknown_template" };
    }

    await this.emailDelivery.send(
      to,
      `[TEST] ${tmpl.subject}`,
      buildEmailContent(tmpl, this.config.baseUrl, "test-token-example"),
    );

    return { success: true };
  }
}
