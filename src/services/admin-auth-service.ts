import { createRemoteJWKSet, jwtVerify, errors } from "jose";
import type { AppConfig } from "@/config";
import { Logger } from "./logger";

type AuthResult =
  | { success: true }
  | { success: false; error: string; status: 401 | 403 | 500 | 503 };

export class AdminAuthService {
  constructor(
    private logger: Logger,
    private authConfig: AppConfig["auth"],
  ) {}

  async verify(token: string | undefined): Promise<AuthResult> {
    if (this.authConfig.disableAuth) {
      return { success: true };
    }

    const { teamName, aud } = this.authConfig;

    if (!teamName || !aud) {
      this.logger.error(
        "Admin auth misconfiguration: CF_ACCESS_TEAM_NAME or CF_ACCESS_AUD not set",
      );
      return { success: false, error: "Server misconfiguration", status: 500 };
    }

    if (!token) {
      return { success: false, error: "Authentication required", status: 401 };
    }

    const jwksUrl = new URL(
      `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`,
    );
    const JWKS = createRemoteJWKSet(jwksUrl);

    try {
      await jwtVerify(token, JWKS, { audience: aud });
    } catch (e) {
      if (e instanceof errors.JWTExpired) {
        return { success: false, error: "Token expired", status: 403 };
      }
      if (e instanceof TypeError) {
        return { success: false, error: "Service unavailable", status: 503 };
      }
      return { success: false, error: "Invalid token", status: 403 };
    }

    return { success: true };
  }
}
