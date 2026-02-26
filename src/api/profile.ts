import { Hono } from "hono";
import { container } from "@/container";
import { SendMagicLinkEmailCommand } from "@/use-cases/send-magic-link-email-command";
import { SendEmailChangeConfirmationCommand } from "@/use-cases/send-email-change-confirmation-command";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { ValidateMagicLinkQuery } from "@/use-cases/validate-magic-link-query";
import { UpdateProfileCommand } from "@/use-cases/update-profile-command";

const app = new Hono()
  .post("/request-link", async (c) => {
    const body = await c.req.json<{ email?: string }>();
    const email = body.email ?? "";

    if (email) {
      const command = container.resolve(RequestMagicLinkCommand);
      const token = await command.execute(email);
      if (token) {
        const sendMagicLink = container.resolve(SendMagicLinkEmailCommand);
        await sendMagicLink.execute(email, token);
      }
    }

    return c.json({ status: "link_sent" }, 200);
  })
  .get("/", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Missing token" }, 401);
    }

    const query = container.resolve(ValidateMagicLinkQuery);
    const subscriber = await query.execute(token);
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

    const command = container.resolve(UpdateProfileCommand);
    const result = await command.execute(body.token, {
      nickname: body.nickname,
      email: body.email,
    });

    if (result.error === "invalid_token") {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
    if (result.error === "email_taken") {
      return c.json({ error: "Email already in use" }, 409);
    }

    if (result.emailChangeToken && body.email) {
      const sendEmailChange = container.resolve(
        SendEmailChangeConfirmationCommand,
      );
      await sendEmailChange.execute(body.email, result.emailChangeToken);
    }

    return c.json({ status: "updated" }, 200);
  });

export default app;
