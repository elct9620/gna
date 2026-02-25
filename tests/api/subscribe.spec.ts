import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { container } from "@/container";
import { EmailSender } from "@/services/emailSender";
import { subscribers } from "@/db/schema";
import app from "@/index";
import { MockEmailSender } from "../helpers/mockEmailSender";

describe("POST /api/subscribe", () => {
  let mockEmailSender: MockEmailSender;

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);

    mockEmailSender = new MockEmailSender();
    container.register(EmailSender, {
      useValue: mockEmailSender as unknown as EmailSender,
    });
  });

  it("should return 201 with confirmation_sent status", async () => {
    const res = await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe("confirmation_sent");
  });

  it("should send confirmation email on new subscription", async () => {
    await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "email-test@example.com" }),
      },
      env,
    );

    expect(mockEmailSender.sentEmails).toHaveLength(1);
    expect(mockEmailSender.sentEmails[0].to).toEqual([
      "email-test@example.com",
    ]);
    expect(mockEmailSender.sentEmails[0].subject).toBe(
      "Confirm your subscription",
    );
  });

  it("should resend confirmation for duplicate pending email", async () => {
    const payload = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com" }),
    };
    await app.request("/api/subscribe", payload, env);
    mockEmailSender.reset();

    const res = await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "dup@example.com" }),
      },
      env,
    );
    expect(res.status).toBe(201);
    expect(mockEmailSender.sentEmails).toHaveLength(1);
  });

  it("should return 400 when email is missing", async () => {
    const res = await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("should return 400 for invalid email", async () => {
    const res = await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("should return 201 with nickname", async () => {
    const res = await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nick@example.com",
          nickname: "Nick",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
  });

  it("should include CORS headers", async () => {
    const res = await app.request(
      "/api/subscribe",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "POST",
        },
      },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
