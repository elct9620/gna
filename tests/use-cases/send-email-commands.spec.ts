import { describe, it, expect, beforeEach } from "vitest";
import type {
  IEmailDelivery,
  EmailContent,
} from "@/use-cases/ports/email-delivery";
import { SendConfirmationEmailCommand } from "@/use-cases/send-confirmation-email-command";
import { SendMagicLinkEmailCommand } from "@/use-cases/send-magic-link-email-command";
import { SendEmailChangeConfirmationCommand } from "@/use-cases/send-email-change-confirmation-command";
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
  const baseUrl = "https://test.example.com";

  beforeEach(() => {
    mockDelivery = new MockEmailDelivery();
  });

  describe("SendConfirmationEmailCommand", () => {
    it("should send confirmation email with correct URL", async () => {
      const command = new SendConfirmationEmailCommand(mockDelivery, baseUrl);
      await command.execute("test@example.com", "abc123");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("test@example.com");
      expect(sent.subject).toBe("Confirm your subscription");
      expect(sent.content.actionUrl).toBe(
        "https://test.example.com/confirm?token=abc123",
      );
      expect(sent.content.heading).toBe("Confirm Your Subscription");
    });
  });

  describe("SendMagicLinkEmailCommand", () => {
    it("should send magic link email with correct URL", async () => {
      const command = new SendMagicLinkEmailCommand(mockDelivery, baseUrl);
      await command.execute("test@example.com", "magic123");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("test@example.com");
      expect(sent.subject).toBe("Your profile access link");
      expect(sent.content.actionUrl).toBe(
        "https://test.example.com/profile?token=magic123",
      );
      expect(sent.content.heading).toBe("Your Profile Access Link");
    });
  });

  describe("SendEmailChangeConfirmationCommand", () => {
    it("should send email change confirmation with correct URL", async () => {
      const command = new SendEmailChangeConfirmationCommand(
        mockDelivery,
        baseUrl,
      );
      await command.execute("new@example.com", "change123");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("new@example.com");
      expect(sent.subject).toBe("Confirm your email change");
      expect(sent.content.actionUrl).toBe(
        "https://test.example.com/confirm?token=change123",
      );
      expect(sent.content.heading).toBe("Confirm Email Change");
    });
  });

  describe("SendTestEmailCommand", () => {
    it("should send test email with [TEST] prefix", async () => {
      const command = new SendTestEmailCommand(mockDelivery, baseUrl);
      await command.execute("confirmation", "test@example.com");

      expect(mockDelivery.sentEmails).toHaveLength(1);
      const sent = mockDelivery.sentEmails[0];
      expect(sent.to).toBe("test@example.com");
      expect(sent.subject).toBe("[TEST] Confirm your subscription");
      expect(sent.content.actionUrl).toContain("test-token-example");
    });

    it("should throw error for unknown template", async () => {
      const command = new SendTestEmailCommand(mockDelivery, baseUrl);

      await expect(
        command.execute("nonexistent", "test@example.com"),
      ).rejects.toThrow("Unknown template: nonexistent");
    });
  });
});
