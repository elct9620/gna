import { describe, it, expect, beforeEach } from "vitest";
import { container } from "@/container";
import { EmailRenderer } from "@/services/emailRenderer";
import { NotificationService } from "@/services/notificationService";
import { MockEmailSender } from "../helpers/mockEmailSender";

describe("NotificationService", () => {
  let mockEmailSender: MockEmailSender;
  let service: NotificationService;

  beforeEach(() => {
    mockEmailSender = new MockEmailSender();
    const renderer = container.resolve(EmailRenderer);
    service = new NotificationService(
      renderer,
      mockEmailSender as unknown as import("@/services/emailSender").EmailSender,
      "https://test.example.com",
    );
  });

  describe("sendConfirmationEmail", () => {
    it("should send a confirmation email with correct URL", async () => {
      await service.sendConfirmationEmail("test@example.com", "abc123");

      expect(mockEmailSender.sentEmails).toHaveLength(1);
      const sent = mockEmailSender.sentEmails[0];
      expect(sent.to).toEqual(["test@example.com"]);
      expect(sent.subject).toBe("Confirm your subscription");
      expect(sent.html).toContain("confirm-email?token=abc123");
      expect(sent.text).toContain("confirm-email?token=abc123");
    });
  });

  describe("sendMagicLinkEmail", () => {
    it("should send a magic link email with correct URL", async () => {
      await service.sendMagicLinkEmail("test@example.com", "magic123");

      expect(mockEmailSender.sentEmails).toHaveLength(1);
      const sent = mockEmailSender.sentEmails[0];
      expect(sent.to).toEqual(["test@example.com"]);
      expect(sent.subject).toBe("Your profile access link");
      expect(sent.html).toContain("/profile?token=magic123");
      expect(sent.text).toContain("/profile?token=magic123");
    });
  });

  describe("sendEmailChangeConfirmation", () => {
    it("should send an email change confirmation with correct URL", async () => {
      await service.sendEmailChangeConfirmation("new@example.com", "change123");

      expect(mockEmailSender.sentEmails).toHaveLength(1);
      const sent = mockEmailSender.sentEmails[0];
      expect(sent.to).toEqual(["new@example.com"]);
      expect(sent.subject).toBe("Confirm your email change");
      expect(sent.html).toContain("confirm-email?token=change123");
      expect(sent.text).toContain("confirm-email?token=change123");
    });
  });
});
