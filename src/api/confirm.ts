import { Hono } from "hono";
import { container } from "@/container";
import { SubscriptionService } from "@/services/subscription-service";

const app = new Hono().get("/", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect("/confirmed?error=missing_token", 302);
  }

  const service = container.resolve(SubscriptionService);

  const subscriptionResult = await service.confirmSubscription(token);
  if (subscriptionResult) {
    return c.redirect("/confirmed", 302);
  }

  const emailChangeResult = await service.confirmEmailChange(token);
  if (emailChangeResult) {
    return c.redirect("/profile?email_changed=true", 302);
  }

  return c.redirect("/confirmed?error=invalid_token", 302);
});

export default app;
