import { Hono } from "hono";
import { container } from "@/container";
import { NotificationService } from "@/services/notificationService";
import { SubscriptionService } from "@/services/subscriptionService";

const app = new Hono()
  .post("/request-link", async (c) => {
    const body = await c.req.json<{ email?: string }>();
    const email = body.email ?? "";

    if (email) {
      const service = container.resolve(SubscriptionService);
      const token = await service.requestMagicLink(email);
      if (token) {
        const notification = container.resolve(NotificationService);
        await notification.sendMagicLinkEmail(email, token);
      }
    }

    return c.json({ status: "link_sent" }, 200);
  })
  .get("/", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Missing token" }, 401);
    }

    const service = container.resolve(SubscriptionService);
    const subscriber = await service.validateMagicLink(token);
    if (!subscriber) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    return c.json({ email: subscriber.email, nickname: subscriber.nickname });
  })
  .post("/update", async (c) => {
    const body = await c.req.json<{
      token?: string;
      nickname?: string;
      email?: string;
    }>();

    if (!body.token) {
      return c.json({ error: "Missing token" }, 401);
    }

    const service = container.resolve(SubscriptionService);
    const subscriber = await service.validateMagicLink(body.token);
    if (!subscriber) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    if (body.email && body.email !== subscriber.email) {
      if (await service.isEmailTaken(body.email)) {
        return c.json({ error: "Email already in use" }, 409);
      }
    }

    await service.consumeMagicLink(body.token);

    if (body.nickname !== undefined) {
      await service.updateNickname(subscriber.email, body.nickname);
    }

    if (body.email && body.email !== subscriber.email) {
      const emailToken = await service.requestEmailChange(
        subscriber.email,
        body.email,
      );
      if (emailToken) {
        const notification = container.resolve(NotificationService);
        await notification.sendEmailChangeConfirmation(body.email, emailToken);
      }
    }

    return c.json({ status: "updated" }, 200);
  });

export default app;
