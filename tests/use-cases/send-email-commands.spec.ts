import { describe, it, expect, beforeEach } from "vitest";
import type {
  IEmailDelivery,
  EmailContent,
} from "@/use-cases/ports/email-delivery";
import type { IAppConfig } from "@/use-cases/ports/config";
import { NotificationService } from "@/services/notification-service";
import { EmailRenderer } from "@/services/email-renderer";
import { SendTestEmailCommand } from "@/use-cases/send-test-email-command";
import { MockEmailSender } from "../helpers/mock-email-sender";

class MockEmailDelivery implements IEmailDelivery {
  sentEmails: { to: string; subject: string; content: EmailContent }[] = [];

  async send(
    to: string,
    subject: string,
    content: EmailContent,
  ): Promise<void> {
    this.sentEmails.push({ to, subject, content });
  }

  async sendTemplate(): Promise<void> {
    throw new Error("Not implemented in mock");
  }
}

describe("Send Email Commands", () => {
  describe("NotificationService.sendTemplate", () => {
    let mockSender: MockEmailSender;
    let service: NotificationService;
    const baseUrl = "https://test.example.com";

    beforeEach(() => {
      mockSender = new MockEmailSender();
      service = new NotificationService(
        new EmailRenderer(),
        mockSender,
        baseUrl,
      );
    });

    it("should send confirmation email with correct URL", async () => {
      await service.sendTemplate("confirmation", "test@example.com", "abc123");

      expect(mockSender.sentEmails).toHaveLength(1);
      const sent = mockSender.sentEmails[0];
      expect(sent.to).toEqual(["test@example.com"]);
      expect(sent.subject).toBe("Confirm your subscription");
    });

    it("should send magic link email with correct URL", async () => {
      await service.sendTemplate("magic_link", "test@example.com", "magic123");

      expect(mockSender.sentEmails).toHaveLength(1);
      const sent = mockSender.sentEmails[0];
      expect(sent.to).toEqual(["test@example.com"]);
      expect(sent.subject).toBe("Your profile access link");
    });

    it("should send email change confirmation with correct URL", async () => {
      await service.sendTemplate(
        "email_change",
        "new@example.com",
        "change123",
      );

      expect(mockSender.sentEmails).toHaveLength(1);
      const sent = mockSender.sentEmails[0];
      expect(sent.to).toEqual(["new@example.com"]);
      expect(sent.subject).toBe("Confirm your email change");
    });

    it("should throw error for unknown template", async () => {
      await expect(
        service.sendTemplate("nonexistent", "test@example.com", "token"),
      ).rejects.toThrow("Unknown email template: nonexistent");
    });
  });

  describe("SendTestEmailCommand", () => {
    let mockDelivery: MockEmailDelivery;
    const config: IAppConfig = {
      baseUrl: "https://test.example.com",
      confirmationTtlMs: 24 * 60 * 60 * 1000,
      magicLinkTtlMs: 15 * 60 * 1000,
    };

    beforeEach(() => {
      mockDelivery = new MockEmailDelivery();
    });

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
