import { createElement } from "react";
import { EmailRenderer } from "./emailRenderer";
import { EmailSender } from "./emailSender";
import { BaseEmail, type BaseEmailProps } from "@/emails/baseEmail";

interface EmailTemplateConfig {
  subject: string;
  previewText: string;
  heading: string;
  bodyText: string;
  actionText: string;
  actionPath: string;
}

const EMAIL_TEMPLATES: Record<string, EmailTemplateConfig> = {
  confirmation: {
    subject: "Confirm your subscription",
    previewText: "Please confirm your newsletter subscription",
    heading: "Confirm Your Subscription",
    bodyText:
      "Thank you for subscribing! Click the button below to confirm your subscription.",
    actionText: "Confirm Subscription",
    actionPath: "/confirm",
  },
  magic_link: {
    subject: "Your profile access link",
    previewText: "Access your subscriber profile",
    heading: "Your Profile Access Link",
    bodyText:
      "Click the button below to access your subscriber profile. This link expires in 15 minutes.",
    actionText: "Access Profile",
    actionPath: "/profile",
  },
  email_change: {
    subject: "Confirm your email change",
    previewText: "Confirm your email address change",
    heading: "Confirm Email Change",
    bodyText:
      "Click the button below to confirm your new email address for the newsletter.",
    actionText: "Confirm Email Change",
    actionPath: "/confirm",
  },
};

export const VALID_TEMPLATE_NAMES = Object.keys(EMAIL_TEMPLATES);

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

  private buildProps(
    template: EmailTemplateConfig,
    token: string,
  ): BaseEmailProps {
    return {
      previewText: template.previewText,
      heading: template.heading,
      bodyText: template.bodyText,
      actionUrl: `${this.baseUrl}${template.actionPath}?token=${token}`,
      actionText: template.actionText,
    };
  }

  async sendConfirmationEmail(
    email: string,
    confirmationToken: string,
  ): Promise<void> {
    const template = EMAIL_TEMPLATES.confirmation;
    await this.renderAndSend(
      email,
      template.subject,
      this.buildProps(template, confirmationToken),
    );
  }

  async sendMagicLinkEmail(
    email: string,
    magicLinkToken: string,
  ): Promise<void> {
    const template = EMAIL_TEMPLATES.magic_link;
    await this.renderAndSend(
      email,
      template.subject,
      this.buildProps(template, magicLinkToken),
    );
  }

  async sendEmailChangeConfirmation(
    email: string,
    emailConfirmationToken: string,
  ): Promise<void> {
    const template = EMAIL_TEMPLATES.email_change;
    await this.renderAndSend(
      email,
      template.subject,
      this.buildProps(template, emailConfirmationToken),
    );
  }

  async sendTestTemplateEmail(template: string, to: string): Promise<void> {
    const config = EMAIL_TEMPLATES[template];
    if (!config) {
      throw new Error(`Unknown template: ${template}`);
    }

    await this.renderAndSend(
      to,
      `[TEST] ${config.subject}`,
      this.buildProps(config, "test-token-example"),
    );
  }
}
