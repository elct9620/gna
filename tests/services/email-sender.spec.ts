import { describe, it, expect, vi } from "vitest";
import type { AwsClient } from "aws4fetch";
import { EmailSender } from "@/services/email-sender";

describe("EmailSender", () => {
  function createMockClient(fetchImpl: typeof fetch) {
    return { fetch: fetchImpl } as unknown as AwsClient;
  }

  function createSender(
    fetchImpl: typeof fetch,
    region = "us-east-1",
    fromAddress = "test@example.com",
  ) {
    return new EmailSender(createMockClient(fetchImpl), region, fromAddress);
  }

  describe("send", () => {
    it("should send a correct SES v2 API request", async () => {
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ MessageId: "test-id" }), {
          status: 200,
        }),
      );

      const sender = createSender(
        mockFetch,
        "ap-northeast-1",
        "noreply@example.com",
      );

      await sender.send({
        to: ["user@example.com"],
        subject: "Test Subject",
        html: "<p>Hello</p>",
        text: "Hello",
      });

      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "https://email.ap-northeast-1.amazonaws.com/v2/email/outbound-emails",
      );
      expect(options?.method).toBe("POST");

      const body = JSON.parse(options?.body as string);
      expect(body).toEqual({
        FromEmailAddress: "noreply@example.com",
        Destination: { ToAddresses: ["user@example.com"] },
        Content: {
          Simple: {
            Subject: { Data: "Test Subject", Charset: "UTF-8" },
            Body: {
              Html: { Data: "<p>Hello</p>", Charset: "UTF-8" },
              Text: { Data: "Hello", Charset: "UTF-8" },
            },
          },
        },
      });
    });

    it("should throw an error when SES API returns non-2xx", async () => {
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response("AccessDeniedException", { status: 403 }),
        );

      const sender = createSender(mockFetch);

      await expect(
        sender.send({
          to: ["user@example.com"],
          subject: "Test",
          html: "<p>Hi</p>",
          text: "Hi",
        }),
      ).rejects.toThrow("SES API error (403): AccessDeniedException");
    });
  });
});
