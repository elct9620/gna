import { Hono } from "hono";
import { container } from "@/container";
import { EMAIL_REGEX } from "@/lib/validation";
import {
  NotificationService,
  VALID_TEMPLATE_NAMES,
} from "@/services/notificationService";
import { SubscriptionService } from "@/services/subscriptionService";

const app = new Hono()
  .get("/subscribers", async (c) => {
    const service = container.resolve(SubscriptionService);
    const subscribers = await service.listSubscribers();

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
    const service = container.resolve(SubscriptionService);
    const removed = await service.removeSubscriber(email);

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

    const service = container.resolve(NotificationService);

    try {
      await service.sendTestTemplateEmail(template, to);
    } catch {
      return c.json({ error: "Email service unavailable" }, 503);
    }

    return c.json({ status: "sent" });
  });

export default app;
