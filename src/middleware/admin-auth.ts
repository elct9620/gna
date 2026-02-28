import { createMiddleware } from "hono/factory";
import { container } from "tsyringe";
import {
  AdminAuthService,
  type AdminAuthConfig,
} from "@/services/admin-auth-service";

export const adminAuth = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authService = container.resolve(AdminAuthService);
    const token = c.req.header("Cf-Access-Jwt-Assertion");
    const config: AdminAuthConfig = {
      teamName: c.env.CF_ACCESS_TEAM_NAME,
      aud: c.env.CF_ACCESS_AUD,
      disableAuth: c.env.DISABLE_AUTH === "true",
    };
    const result = await authService.verify(config, token);

    if (!result.success) {
      return c.json({ error: result.error }, result.status);
    }

    return next();
  },
);
