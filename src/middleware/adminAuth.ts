import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify, errors } from "jose";

export const adminAuth = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    if (c.env.DISABLE_AUTH === "true") {
      return next();
    }

    const teamName = c.env.CF_ACCESS_TEAM_NAME;
    const aud = c.env.CF_ACCESS_AUD;

    if (!teamName || !aud) {
      console.error(
        "Admin auth misconfiguration: CF_ACCESS_TEAM_NAME or CF_ACCESS_AUD not set",
      );
      return c.json({ error: "Server misconfiguration" }, 500);
    }

    const token = c.req.header("Cf-Access-Jwt-Assertion");
    if (!token) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const jwksUrl = new URL(
      `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`,
    );
    const JWKS = createRemoteJWKSet(jwksUrl);

    try {
      await jwtVerify(token, JWKS, { audience: aud });
    } catch (e) {
      if (e instanceof errors.JWTExpired) {
        return c.json({ error: "Token expired" }, 403);
      }
      if (e instanceof TypeError) {
        return c.json({ error: "Service unavailable" }, 503);
      }
      return c.json({ error: "Invalid token" }, 403);
    }

    return next();
  },
);
