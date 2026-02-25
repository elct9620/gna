import "reflect-metadata";
import "@/container";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { container } from "@/container";
import { adminAuth } from "./middleware/adminAuth";
import { renderer } from "./renderer";
import { routes } from "./routes";
import { NotificationService } from "./services/notificationService";
import { SubscriptionService } from "./services/subscriptionService";

const app = new Hono<{ Bindings: Env }>();

app.use(renderer);

app.use("/api/*", cors());

app.use("/admin/*", adminAuth);
app.use("/admin", adminAuth);

app.post("/api/subscribe", async (c) => {
  const service = container.resolve(SubscriptionService);
  const notification = container.resolve(NotificationService);
  const body = await c.req.json<{ email?: string; nickname?: string }>();

  let result;
  try {
    result = service.subscribe(body.email ?? "", body.nickname);
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
});

app.get("/api/unsubscribe", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "Missing token" }, 400);
  }

  const service = container.resolve(SubscriptionService);
  service.unsubscribe(token);

  return c.redirect("/unsubscribe?status=success", 302);
});

app.get("/api/profile/confirm-email", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "Missing token" }, 400);
  }

  const service = container.resolve(SubscriptionService);

  const subscriptionResult = service.confirmSubscription(token);
  if (subscriptionResult) {
    return c.redirect("/?confirmed=true", 302);
  }

  const emailChangeResult = service.confirmEmailChange(token);
  if (emailChangeResult) {
    return c.redirect("/profile?email_changed=true", 302);
  }

  return c.json({ error: "Invalid or expired token" }, 400);
});

app.post("/api/profile/request-link", async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = body.email ?? "";

  if (email) {
    const service = container.resolve(SubscriptionService);
    const token = service.requestMagicLink(email);
    if (token) {
      const notification = container.resolve(NotificationService);
      await notification.sendMagicLinkEmail(email, token);
    }
  }

  return c.json({ status: "link_sent" }, 200);
});

app.get("/api/profile", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "Missing token" }, 401);
  }

  const service = container.resolve(SubscriptionService);
  const subscriber = service.validateMagicLink(token);
  if (!subscriber) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  return c.json({ email: subscriber.email, nickname: subscriber.nickname });
});

app.post("/api/profile/update", async (c) => {
  const body = await c.req.json<{
    token?: string;
    nickname?: string;
    email?: string;
  }>();

  if (!body.token) {
    return c.json({ error: "Missing token" }, 401);
  }

  const service = container.resolve(SubscriptionService);
  const subscriber = service.validateMagicLink(body.token);
  if (!subscriber) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  service.consumeMagicLink(body.token);

  if (body.nickname !== undefined) {
    service.updateNickname(subscriber.email, body.nickname);
  }

  if (body.email && body.email !== subscriber.email) {
    if (service.isEmailTaken(body.email)) {
      return c.json({ error: "Email already in use" }, 409);
    }

    const emailToken = service.requestEmailChange(subscriber.email, body.email);
    if (emailToken) {
      const notification = container.resolve(NotificationService);
      await notification.sendEmailChangeConfirmation(body.email, emailToken);
    }
  }

  return c.json({ status: "updated" }, 200);
});

app.get("/admin/api/subscribers", async (c) => {
  const service = container.resolve(SubscriptionService);
  const subscribers = service.listSubscribers();

  return c.json({
    subscribers: subscribers.map((s) => ({
      email: s.email,
      nickname: s.nickname,
      subscribedAt: s.subscribedAt.toISOString(),
    })),
  });
});

app.delete("/admin/api/subscribers/:email", async (c) => {
  const email = c.req.param("email");
  const service = container.resolve(SubscriptionService);
  const removed = service.removeSubscriber(email);

  if (!removed) {
    return c.json({ error: "Subscriber not found" }, 404);
  }

  return c.json({ message: "Subscriber removed" });
});

const { query, dataRoutes } = createStaticHandler(routes);

app.all("*", async (c) => {
  const context = await query(c.req.raw);

  if (context instanceof Response) {
    return context;
  }

  const router = createStaticRouter(dataRoutes, context);

  c.status(context.statusCode as 200);
  return c.render(<StaticRouterProvider router={router} context={context} />);
});

export default app;
