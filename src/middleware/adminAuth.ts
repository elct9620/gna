import { createMiddleware } from "hono/factory";
import { container } from "tsyringe";
import { AdminAuthService } from "@/services/adminAuthService";

export const adminAuth = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authService = container.resolve(AdminAuthService);
    const token = c.req.header("Cf-Access-Jwt-Assertion");
    const result = await authService.verify(c.env, token);

    if (!result.success) {
      return c.json({ error: result.error }, result.status);
    }

    return next();
  },
);
