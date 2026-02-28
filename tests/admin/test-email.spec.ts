import { describe, it, expect, beforeEach } from "vitest";
import { container } from "@/container";
import { EmailSender } from "@/services/email-sender";
import app from "@/index";
import { MockEmailSender } from "../helpers/mock-email-sender";
import { registerAuth } from "../helpers/auth";

describe("POST /admin/api/test-email/template", () => {
  let mockSender: MockEmailSender;

  beforeEach(() => {
    mockSender = new MockEmailSender();
    registerAuth({ disableAuth: true });
    container.register(EmailSender, {
      useValue: mockSender as unknown as EmailSender,
    });
  });

  it("should send test confirmation email", async () => {
    const res = await app.request("/admin/api/test-email/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "confirmation",
        to: "test@example.com",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "sent" });
    expect(mockSender.sentEmails).toHaveLength(1);
    expect(mockSender.sentEmails[0].to).toEqual(["test@example.com"]);
    expect(mockSender.sentEmails[0].subject).toBe(
      "[TEST] Confirm your subscription",
    );
  });

  it("should send test magic_link email", async () => {
    const res = await app.request("/admin/api/test-email/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "magic_link",
        to: "test@example.com",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "sent" });
    expect(mockSender.sentEmails).toHaveLength(1);
    expect(mockSender.sentEmails[0].subject).toBe(
      "[TEST] Your profile access link",
    );
  });

  it("should send test email_change email", async () => {
    const res = await app.request("/admin/api/test-email/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "email_change",
        to: "test@example.com",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "sent" });
    expect(mockSender.sentEmails).toHaveLength(1);
    expect(mockSender.sentEmails[0].subject).toBe(
      "[TEST] Confirm your email change",
    );
  });

  it("should return 400 for invalid template name", async () => {
    const res = await app.request("/admin/api/test-email/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "nonexistent",
        to: "test@example.com",
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid template name" });
    expect(mockSender.sentEmails).toHaveLength(0);
  });

  it("should return 400 for invalid email address", async () => {
    const res = await app.request("/admin/api/test-email/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "confirmation",
        to: "not-an-email",
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid email address" });
    expect(mockSender.sentEmails).toHaveLength(0);
  });

  it("should return 503 when email service fails", async () => {
    mockSender.send = async () => {
      throw new Error("SES API error");
    };

    const res = await app.request("/admin/api/test-email/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "confirmation",
        to: "test@example.com",
      }),
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Email service unavailable" });
  });

  it("should require admin auth", async () => {
    registerAuth({
      disableAuth: false,
      teamName: "myteam",
      aud: "test-aud",
    });

    const res = await app.request("/admin/api/test-email/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "confirmation",
        to: "test@example.com",
      }),
    });

    expect(res.status).toBe(401);
  });
});
