import type { IAppConfig } from "@/use-cases/ports/config";

export interface AppConfig extends IAppConfig {
  awsRegion: string;
  fromAddress: string;
  auth: {
    teamName: string | undefined;
    aud: string | undefined;
    disableAuth: boolean;
  };
}

export const APP_CONFIG = Symbol("APP_CONFIG");
