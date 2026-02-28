import type { IEmailDelivery } from "./ports/email-delivery";
import type { IAppConfig } from "./ports/config";
import { EMAIL_TEMPLATES, buildEmailContent } from "@/emails/templates";
import { EMAIL_REGEX } from "@/lib/validation";

export class SendTestEmailCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private config: IAppConfig,
  ) {}

  async execute(template: string, to: string): Promise<void> {
    if (!EMAIL_REGEX.test(to)) {
      throw new Error("Invalid email address");
    }

    const tmpl = EMAIL_TEMPLATES[template];
    if (!tmpl) {
      throw new Error(`Unknown template: ${template}`);
    }

    await this.emailDelivery.send(
      to,
      `[TEST] ${tmpl.subject}`,
      buildEmailContent(tmpl, this.config.baseUrl, "test-token-example"),
    );
  }
}
