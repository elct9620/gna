import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("POST /api/subscribe", () => {
  it("should return 201 on successful subscription", async () => {
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
    const body = await res.json();
    expect(body).toHaveProperty("message");
  });

  it("should return 201 on duplicate email (idempotent)", async () => {
    const payload = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "duplicate@example.com" }),
    };
    await app.request("/api/subscribe", payload, env);
    const res = await app.request(
      "/api/subscribe",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "duplicate@example.com" }),
      },
      env,
    );
    expect(res.status).toBe(201);
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
