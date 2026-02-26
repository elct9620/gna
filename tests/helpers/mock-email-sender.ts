import type { SendEmailParams } from "@/services/email-sender";

export class MockEmailSender {
  sentEmails: SendEmailParams[] = [];

  async send(params: SendEmailParams): Promise<void> {
    this.sentEmails.push(params);
  }

  reset(): void {
    this.sentEmails = [];
  }
}
