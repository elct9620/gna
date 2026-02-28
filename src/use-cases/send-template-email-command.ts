import type { IEmailDelivery } from "./ports/email-delivery";
import type { IAppConfig } from "./ports/config";
import { EMAIL_TEMPLATES, buildEmailContent } from "@/emails/templates";

export type SendTemplateEmailResult =
  | { success: true }
  | { success: false; error: "unknown_template" };

export class SendTemplateEmailCommand {
  constructor(
    private emailDelivery: IEmailDelivery,
    private config: IAppConfig,
  ) {}

  async execute(
    template: string,
    email: string,
    token: string,
  ): Promise<SendTemplateEmailResult> {
    const t = EMAIL_TEMPLATES[template];
    if (!t) return { success: false, error: "unknown_template" };
    await this.emailDelivery.send(
      email,
      t.subject,
      buildEmailContent(t, this.config.baseUrl, token),
    );
    return { success: true };
  }
}
