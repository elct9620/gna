import type { Subscriber } from "@/entities/subscriber";

export interface IMagicLinkValidator {
  execute(token: string): Promise<Subscriber | null>;
}
