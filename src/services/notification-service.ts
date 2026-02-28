import { createElement } from "react";
import { EmailRenderer } from "./email-renderer";
import type { IEmailSender } from "./email-sender";
import { BaseEmail } from "@/emails/base-email";
import { EMAIL_TEMPLATES, buildEmailContent } from "@/emails/templates";
import type {
  IEmailDelivery,
  EmailContent,
} from "@/use-cases/ports/email-delivery";

export class NotificationService implements IEmailDelivery {
  constructor(
    private emailRenderer: EmailRenderer,
    private emailSender: IEmailSender,
    private baseUrl: string,
  ) {}

  async send(
    to: string,
    subject: string,
    content: EmailContent,
  ): Promise<void> {
    const element = createElement(BaseEmail, {
      previewText: content.previewText,
      heading: content.heading,
      bodyText: content.bodyText,
      actionUrl: content.actionUrl,
      actionText: content.actionText,
    });

    const [html, text] = await Promise.all([
      this.emailRenderer.renderToHtml(element),
      this.emailRenderer.renderToPlainText(element),
    ]);

    await this.emailSender.send({
      to: [to],
      subject,
      html,
      text,
    });
  }

  async sendTemplate(
    template: string,
    email: string,
    token: string,
  ): Promise<void> {
    const t = EMAIL_TEMPLATES[template];
    if (!t) throw new Error(`Unknown email template: ${template}`);
    await this.send(
      email,
      t.subject,
      buildEmailContent(t, this.baseUrl, token),
    );
  }
}
