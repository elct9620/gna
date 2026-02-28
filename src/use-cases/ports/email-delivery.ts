export interface EmailContent {
  previewText: string;
  heading: string;
  bodyText: string;
  actionUrl: string;
  actionText: string;
}

export interface IEmailDelivery {
  send(to: string, subject: string, content: EmailContent): Promise<void>;
  sendTemplate(template: string, email: string, token: string): Promise<void>;
}
