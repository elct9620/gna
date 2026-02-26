import { Hono } from "hono";
import { container } from "@/container";
import { EMAIL_REGEX } from "@/lib/validation";
import { VALID_TEMPLATE_NAMES } from "@/emails/templates";
import { SendTestEmailCommand } from "@/use-cases/send-test-email-command";
import { ListSubscribersQuery } from "@/use-cases/list-subscribers-query";
import { RemoveSubscriberCommand } from "@/use-cases/remove-subscriber-command";

const app = new Hono()
  .get("/subscribers", async (c) => {
    const query = container.resolve(ListSubscribersQuery);
    const subscribers = await query.execute();

    return c.json({
      subscribers: subscribers.map((s) => ({
        email: s.email,
        nickname: s.nickname,
        status: s.status,
      })),
    });
  })
  .delete("/subscribers/:email", async (c) => {
    const email = c.req.param("email");
    const command = container.resolve(RemoveSubscriberCommand);
    const removed = await command.execute(email);

    if (!removed) {
      return c.json({ error: "Subscriber not found" }, 404);
    }

    return c.json({ message: "Subscriber removed" });
  })
  .post("/test-email/template", async (c) => {
    const { template, to } = await c.req.json<{
      template: string;
      to: string;
    }>();

    if (!VALID_TEMPLATE_NAMES.includes(template)) {
      return c.json({ error: "Invalid template name" }, 400);
    }

    if (!EMAIL_REGEX.test(to)) {
      return c.json({ error: "Invalid email address" }, 400);
    }

    const command = container.resolve(SendTestEmailCommand);

    try {
      await command.execute(template, to);
    } catch {
      return c.json({ error: "Email service unavailable" }, 503);
    }

    return c.json({ status: "sent" });
  });

export default app;
