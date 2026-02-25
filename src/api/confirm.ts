import { Hono } from "hono";
import { container } from "@/container";
import { SubscriptionService } from "@/services/subscriptionService";

const app = new Hono().get("/", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "Missing token" }, 400);
  }

  const service = container.resolve(SubscriptionService);

  const subscriptionResult = service.confirmSubscription(token);
  if (subscriptionResult) {
    return c.redirect("/confirmed", 302);
  }

  const emailChangeResult = service.confirmEmailChange(token);
  if (emailChangeResult) {
    return c.redirect("/profile?email_changed=true", 302);
  }

  return c.json({ error: "Invalid or expired token" }, 400);
});

export default app;
