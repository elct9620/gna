import { Hono } from "hono";
import { container } from "@/container";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { ConfirmEmailChangeCommand } from "@/use-cases/confirm-email-change-command";

const app = new Hono().get("/", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect("/confirmed?error=missing_token", 302);
  }

  const confirmSubscription = container.resolve(ConfirmSubscriptionCommand);
  const subscriptionResult = await confirmSubscription.execute(token);
  if (subscriptionResult) {
    return c.redirect("/confirmed", 302);
  }

  const confirmEmailChange = container.resolve(ConfirmEmailChangeCommand);
  const emailChangeResult = await confirmEmailChange.execute(token);
  if (emailChangeResult) {
    return c.redirect("/profile?email_changed=true", 302);
  }

  return c.redirect("/confirmed?error=invalid_token", 302);
});

export default app;
