import { createElement } from "react";
import { EmailRenderer } from "./emailRenderer";
import { EmailSender } from "./emailSender";
import { BaseEmail, type BaseEmailProps } from "@/emails/baseEmail";

export class NotificationService {
  constructor(
    private emailRenderer: EmailRenderer,
    private emailSender: EmailSender,
    private baseUrl: string,
  ) {}

  private async renderAndSend(
    email: string,
    subject: string,
    props: BaseEmailProps,
  ): Promise<void> {
    const element = createElement(BaseEmail, props);

    const [html, text] = await Promise.all([
      this.emailRenderer.renderToHtml(element),
      this.emailRenderer.renderToPlainText(element),
    ]);

    await this.emailSender.send({
      to: [email],
      subject,
      html,
      text,
    });
  }

  async sendConfirmationEmail(
    email: string,
    confirmationToken: string,
  ): Promise<void> {
    await this.renderAndSend(email, "Confirm your subscription", {
      previewText: "Please confirm your newsletter subscription",
      heading: "Confirm Your Subscription",
      bodyText:
        "Thank you for subscribing! Click the button below to confirm your subscription.",
      actionUrl: `${this.baseUrl}/confirm?token=${confirmationToken}`,
      actionText: "Confirm Subscription",
    });
  }

  async sendMagicLinkEmail(
    email: string,
    magicLinkToken: string,
  ): Promise<void> {
    await this.renderAndSend(email, "Your profile access link", {
      previewText: "Access your subscriber profile",
      heading: "Your Profile Access Link",
      bodyText:
        "Click the button below to access your subscriber profile. This link expires in 15 minutes.",
      actionUrl: `${this.baseUrl}/profile?token=${magicLinkToken}`,
      actionText: "Access Profile",
    });
  }

  async sendEmailChangeConfirmation(
    email: string,
    emailConfirmationToken: string,
  ): Promise<void> {
    await this.renderAndSend(email, "Confirm your email change", {
      previewText: "Confirm your email address change",
      heading: "Confirm Email Change",
      bodyText:
        "Click the button below to confirm your new email address for the newsletter.",
      actionUrl: `${this.baseUrl}/confirm?token=${emailConfirmationToken}`,
      actionText: "Confirm Email Change",
    });
  }

  async sendTestTemplateEmail(template: string, to: string): Promise<void> {
    const demoData: Record<string, { subject: string; props: BaseEmailProps }> =
      {
        confirmation: {
          subject: "Confirm your subscription",
          props: {
            previewText: "Please confirm your newsletter subscription",
            heading: "Confirm Your Subscription",
            bodyText:
              "Thank you for subscribing! Click the button below to confirm your subscription.",
            actionUrl: `${this.baseUrl}/confirm?token=test-token-example`,
            actionText: "Confirm Subscription",
          },
        },
        magic_link: {
          subject: "Your profile access link",
          props: {
            previewText: "Access your subscriber profile",
            heading: "Your Profile Access Link",
            bodyText:
              "Click the button below to access your subscriber profile. This link expires in 15 minutes.",
            actionUrl: `${this.baseUrl}/profile?token=test-token-example`,
            actionText: "Access Profile",
          },
        },
        email_change: {
          subject: "Confirm your email change",
          props: {
            previewText: "Confirm your email address change",
            heading: "Confirm Email Change",
            bodyText:
              "Click the button below to confirm your new email address for the newsletter.",
            actionUrl: `${this.baseUrl}/confirm?token=test-token-example`,
            actionText: "Confirm Email Change",
          },
        },
      };

    const data = demoData[template];
    if (!data) {
      throw new Error(`Unknown template: ${template}`);
    }

    await this.renderAndSend(to, `[TEST] ${data.subject}`, data.props);
  }
}
