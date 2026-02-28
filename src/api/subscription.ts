import { Hono } from "hono";
import { container } from "@/container";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { UnsubscribeCommand } from "@/use-cases/unsubscribe-command";

const app = new Hono()
  .post("/subscribe", async (c) => {
    const command = container.resolve(SubscribeCommand);
    const body = await c.req.json<{ email?: string; nickname?: string }>();

    const result = await command.execute(body.email ?? "", body.nickname);

    if (result.action === "invalid_email") {
      return c.json({ error: "Invalid email address" }, 400);
    }

    return c.json({ status: "confirmation_sent" }, 201);
  })
  .get("/unsubscribe", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Missing token" }, 400);
    }

    const command = container.resolve(UnsubscribeCommand);
    await command.execute(token);

    return c.redirect("/unsubscribe?status=success", 302);
  });

export default app;
