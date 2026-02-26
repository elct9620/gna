import { createElement } from "react";
import { EmailRenderer } from "./email-renderer";
import { EmailSender } from "./email-sender";
import { BaseEmail } from "@/emails/base-email";
import type {
  IEmailDelivery,
  EmailContent,
} from "@/use-cases/ports/email-delivery";

export class NotificationService implements IEmailDelivery {
  constructor(
    private emailRenderer: EmailRenderer,
    private emailSender: EmailSender,
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
}
