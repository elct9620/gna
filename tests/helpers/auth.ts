import { container } from "@/container";
import { AdminAuthService } from "@/services/admin-auth-service";
import { Logger } from "@/services/logger";

export function registerAuth(authConfig: {
  teamName?: string;
  aud?: string;
  disableAuth: boolean;
}) {
  container.register(AdminAuthService, {
    useValue: new AdminAuthService(container.resolve(Logger), {
      teamName: authConfig.teamName,
      aud: authConfig.aud,
      disableAuth: authConfig.disableAuth,
    }),
  });
}
