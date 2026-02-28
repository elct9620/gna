import type { AwsClient } from "aws4fetch";
import type { AppConfig } from "@/config";

export interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export class EmailSender {
  constructor(
    private client: AwsClient,
    private config: AppConfig,
  ) {}

  async send(params: SendEmailParams): Promise<void> {
    const endpoint = `https://email.${this.config.awsRegion}.amazonaws.com/v2/email/outbound-emails`;

    const response = await this.client.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FromEmailAddress: this.config.fromAddress,
        Destination: { ToAddresses: params.to },
        Content: {
          Simple: {
            Subject: { Data: params.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: params.html, Charset: "UTF-8" },
              Text: { Data: params.text, Charset: "UTF-8" },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SES API error (${response.status}): ${body}`);
    }
  }
}
