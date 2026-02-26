import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { Html, Text } from "@react-email/components";
import { container } from "@/container";
import { EmailRenderer } from "@/services/email-renderer";

describe("EmailRenderer", () => {
  it("should resolve from DI container", () => {
    const renderer = container.resolve(EmailRenderer);
    expect(renderer).toBeInstanceOf(EmailRenderer);
  });

  describe("renderToHtml", () => {
    it("should render a React element to HTML with doctype", async () => {
      const renderer = container.resolve(EmailRenderer);
      const element = createElement(
        Html,
        null,
        createElement(Text, null, "Hello, World!"),
      );

      const html = await renderer.renderToHtml(element);

      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain("Hello, World!");
    });
  });

  describe("renderToPlainText", () => {
    it("should render a React element to plain text without HTML tags", async () => {
      const renderer = container.resolve(EmailRenderer);
      const element = createElement(
        Html,
        null,
        createElement(Text, null, "Hello, World!"),
      );

      const text = await renderer.renderToPlainText(element);

      expect(text).toContain("Hello, World!");
      expect(text).not.toContain("<");
    });
  });
});
