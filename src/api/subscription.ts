import { Hono } from "hono";
import { container } from "@/container";
import { NotificationService } from "@/services/notification-service";
import { SubscriptionService } from "@/services/subscription-service";

const app = new Hono()
  .post("/subscribe", async (c) => {
    const service = container.resolve(SubscriptionService);
    const notification = container.resolve(NotificationService);
    const body = await c.req.json<{ email?: string; nickname?: string }>();

    let result;
    try {
      result = await service.subscribe(body.email ?? "", body.nickname);
    } catch {
      return c.json({ error: "Invalid email address" }, 400);
    }

    if (result.action === "created" || result.action === "resend") {
      await notification.sendConfirmationEmail(
        result.subscriber.email,
        result.subscriber.confirmationToken!,
      );
    }

    return c.json({ status: "confirmation_sent" }, 201);
  })
  .get("/unsubscribe", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Missing token" }, 400);
    }

    const service = container.resolve(SubscriptionService);
    await service.unsubscribe(token);

    return c.redirect("/unsubscribe?status=success", 302);
  });

export default app;
