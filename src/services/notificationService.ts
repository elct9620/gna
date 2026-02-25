import { createElement } from "react";
import { EmailRenderer } from "./emailRenderer";
import { EmailSender } from "./emailSender";
import { BaseEmail } from "@/emails/baseEmail";

export class NotificationService {
  constructor(
    private emailRenderer: EmailRenderer,
    private emailSender: EmailSender,
    private baseUrl: string,
  ) {}

  async sendConfirmationEmail(
    email: string,
    confirmationToken: string,
  ): Promise<void> {
    const actionUrl = `${this.baseUrl}/confirm?token=${confirmationToken}`;
    const element = createElement(BaseEmail, {
      previewText: "Please confirm your newsletter subscription",
      heading: "Confirm Your Subscription",
      bodyText:
        "Thank you for subscribing! Click the button below to confirm your subscription.",
      actionUrl,
      actionText: "Confirm Subscription",
    });

    const [html, text] = await Promise.all([
      this.emailRenderer.renderToHtml(element),
      this.emailRenderer.renderToPlainText(element),
    ]);

    await this.emailSender.send({
      to: [email],
      subject: "Confirm your subscription",
      html,
      text,
    });
  }

  async sendMagicLinkEmail(
    email: string,
    magicLinkToken: string,
  ): Promise<void> {
    const actionUrl = `${this.baseUrl}/profile?token=${magicLinkToken}`;
    const element = createElement(BaseEmail, {
      previewText: "Access your subscriber profile",
      heading: "Your Profile Access Link",
      bodyText:
        "Click the button below to access your subscriber profile. This link expires in 15 minutes.",
      actionUrl,
      actionText: "Access Profile",
    });

    const [html, text] = await Promise.all([
      this.emailRenderer.renderToHtml(element),
      this.emailRenderer.renderToPlainText(element),
    ]);

    await this.emailSender.send({
      to: [email],
      subject: "Your profile access link",
      html,
      text,
    });
  }

  async sendEmailChangeConfirmation(
    email: string,
    emailConfirmationToken: string,
  ): Promise<void> {
    const actionUrl = `${this.baseUrl}/confirm?token=${emailConfirmationToken}`;
    const element = createElement(BaseEmail, {
      previewText: "Confirm your email address change",
      heading: "Confirm Email Change",
      bodyText:
        "Click the button below to confirm your new email address for the newsletter.",
      actionUrl,
      actionText: "Confirm Email Change",
    });

    const [html, text] = await Promise.all([
      this.emailRenderer.renderToHtml(element),
      this.emailRenderer.renderToPlainText(element),
    ]);

    await this.emailSender.send({
      to: [email],
      subject: "Confirm your email change",
      html,
      text,
    });
  }
}
