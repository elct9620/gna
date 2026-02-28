import { describe, it, expect, beforeEach } from "vitest";
import { container } from "@/container";
import { EmailRenderer } from "@/services/email-renderer";
import { NotificationService } from "@/services/notification-service";
import { MockEmailSender } from "../helpers/mock-email-sender";

describe("NotificationService", () => {
  let mockEmailSender: MockEmailSender;
  let service: NotificationService;

  beforeEach(() => {
    mockEmailSender = new MockEmailSender();
    const renderer = container.resolve(EmailRenderer);
    service = new NotificationService(renderer, mockEmailSender);
  });

  describe("send", () => {
    it("should render and send email with correct content", async () => {
      await service.send("test@example.com", "Test Subject", {
        previewText: "Preview",
        heading: "Heading",
        bodyText: "Body text",
        actionUrl: "https://example.com/action",
        actionText: "Click Me",
      });

      expect(mockEmailSender.sentEmails).toHaveLength(1);
      const sent = mockEmailSender.sentEmails[0];
      expect(sent.to).toEqual(["test@example.com"]);
      expect(sent.subject).toBe("Test Subject");
      expect(sent.html).toContain("Heading");
      expect(sent.html).toContain("https://example.com/action");
      expect(sent.text.toUpperCase()).toContain("HEADING");
      expect(sent.text).toContain("https://example.com/action");
    });

    it("should include action text in rendered output", async () => {
      await service.send("test@example.com", "Subject", {
        previewText: "Preview",
        heading: "Test Heading",
        bodyText: "Test body",
        actionUrl: "https://example.com/test",
        actionText: "Do Something",
      });

      const sent = mockEmailSender.sentEmails[0];
      expect(sent.html).toContain("Do Something");
    });
  });
});
