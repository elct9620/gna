import { describe, it, expect, beforeEach } from "vitest";
import type {
  IEmailDelivery,
  EmailContent,
} from "@/use-cases/ports/email-delivery";
import type { IAppConfig } from "@/use-cases/ports/config";
import { SendTemplateEmailCommand } from "@/use-cases/send-template-email-command";
import { SendTestEmailCommand } from "@/use-cases/send-test-email-command";

class MockEmailDelivery implements IEmailDelivery {
  sentEmails: { to: string; subject: string; content: EmailContent }[] = [];

  async send(
    to: string,
    subject: string,
    content: EmailContent,
  ): Promise<void> {
    this.sentEmails.push({ to, subject, content });
  }
}

describe("Send Email Commands", () => {
  let mockDelivery: MockEmailDelivery;
  const config: IAppConfig = {
    baseUrl: "https://test.example.com",
    confirmationTtlMs: 24 * 60 * 60 * 1000,
    magicLinkTtlMs: 15 * 60 * 1000,
  };

  beforeEach(() => {
    mockDelivery = new MockEmailDelivery();
  });

  describe("SendTemplateEmailCommand", () => {
    it("should send confirmation email with correct URL", async () => {
      const command = new SendTemplateEmailCommand(mockDelivery, config);
      await command.execute("confirmation", "test@example.com", "abc123");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("test@example.com");
      expect(sent.subject).toBe("Confirm your subscription");
      expect(sent.content.actionUrl).toBe(
        "https://test.example.com/confirm?token=abc123",
      );
      expect(sent.content.heading).toBe("Confirm Your Subscription");
    });

    it("should send magic link email with correct URL", async () => {
      const command = new SendTemplateEmailCommand(mockDelivery, config);
      await command.execute("magic_link", "test@example.com", "magic123");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("test@example.com");
      expect(sent.subject).toBe("Your profile access link");
      expect(sent.content.actionUrl).toBe(
        "https://test.example.com/profile?token=magic123",
      );
      expect(sent.content.heading).toBe("Your Profile Access Link");
    });

    it("should send email change confirmation with correct URL", async () => {
      const command = new SendTemplateEmailCommand(mockDelivery, config);
      await command.execute("email_change", "new@example.com", "change123");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("new@example.com");
      expect(sent.subject).toBe("Confirm your email change");
      expect(sent.content.actionUrl).toBe(
        "https://test.example.com/confirm?token=change123",
      );
      expect(sent.content.heading).toBe("Confirm Email Change");
    });

    it("should return error for unknown template", async () => {
      const command = new SendTemplateEmailCommand(mockDelivery, config);

      const result = await command.execute(
        "nonexistent",
        "test@example.com",
        "token",
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("unknown_template");
      }
    });
  });

  describe("SendTestEmailCommand", () => {
    it("should send test email with [TEST] prefix", async () => {
      const command = new SendTestEmailCommand(mockDelivery, config);
      await command.execute("confirmation", "test@example.com");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("test@example.com");
      expect(sent.subject).toBe("[TEST] Confirm your subscription");
      expect(sent.content.actionUrl).toContain("test-token-example");
    });

    it("should return error for unknown template", async () => {
      const command = new SendTestEmailCommand(mockDelivery, config);

      const result = await command.execute("nonexistent", "test@example.com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("unknown_template");
      }
    });

    it("should return error for invalid email address", async () => {
      const command = new SendTestEmailCommand(mockDelivery, config);

      const result = await command.execute("confirmation", "not-an-email");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("invalid_email");
      }
    });
  });
});
