import { Hono } from "hono";
import { container } from "@/container";
import { RequestMagicLinkCommand } from "@/use-cases/request-magic-link-command";
import { ValidateMagicLinkCommand } from "@/use-cases/validate-magic-link-command";
import { UpdateProfileCommand } from "@/use-cases/update-profile-command";

const app = new Hono()
  .post("/request-link", async (c) => {
    const body = await c.req.json<{ email?: string }>();
    const email = body.email ?? "";

    if (email) {
      const command = container.resolve(RequestMagicLinkCommand);
      await command.execute(email);
    }

    return c.json({ status: "link_sent" }, 200);
  })
  .get("/", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Missing token" }, 401);
    }

    const query = container.resolve(ValidateMagicLinkCommand);
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

    return c.json({ status: "updated" }, 200);
  });

export default app;
