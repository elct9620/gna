import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { container } from "@/container";
import { EmailRenderer } from "@/services/emailRenderer";
import { BaseEmail } from "@/emails/baseEmail";

describe("BaseEmail", () => {
  const renderer = container.resolve(EmailRenderer);

  const props = {
    previewText: "Please confirm your subscription",
    heading: "Confirm Your Subscription",
    bodyText: "Click the button below to confirm your subscription.",
    actionUrl: "https://example.com/confirm?token=abc123",
    actionText: "Confirm",
  };

  it("should render to HTML with key content", async () => {
    const element = createElement(BaseEmail, props);
    const html = await renderer.renderToHtml(element);

    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("Confirm Your Subscription");
    expect(html).toContain(
      "Click the button below to confirm your subscription.",
    );
    expect(html).toContain("https://example.com/confirm?token=abc123");
    expect(html).toContain("Confirm");
    expect(html).toContain("Gna Newsletter");
  });

  it("should render to plain text with key content", async () => {
    const element = createElement(BaseEmail, props);
    const text = await renderer.renderToPlainText(element);

    expect(text.toUpperCase()).toContain("CONFIRM YOUR SUBSCRIPTION");
    expect(text).toContain(
      "Click the button below to confirm your subscription.",
    );
    expect(text).toContain("https://example.com/confirm?token=abc123");
    expect(text).not.toContain("<html");
  });
});
