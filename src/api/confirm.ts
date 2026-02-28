import { Hono } from "hono";
import { container } from "@/container";
import { ConfirmCommand } from "@/use-cases/confirm-command";

const app = new Hono().get("/", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect("/confirmed?error=missing_token", 302);
  }

  const command = container.resolve(ConfirmCommand);
  const result = await command.execute(token);

  switch (result.kind) {
    case "subscription":
      return c.redirect("/confirmed", 302);
    case "email_change":
      return c.redirect("/profile?email_changed=true", 302);
    case "invalid":
      return c.redirect("/confirmed?error=invalid_token", 302);
  }
});

export default app;
