import type { Subscriber } from "@/entities/subscriber";
import { ConfirmSubscriptionCommand } from "./confirm-subscription-command";
import { ConfirmEmailChangeCommand } from "./confirm-email-change-command";

export type ConfirmResult =
  | { kind: "subscription"; subscriber: Subscriber }
  | { kind: "email_change"; subscriber: Subscriber }
  | { kind: "invalid" };

export class ConfirmCommand {
  constructor(
    private confirmSubscription: ConfirmSubscriptionCommand,
    private confirmEmailChange: ConfirmEmailChangeCommand,
  ) {}

  async execute(token: string): Promise<ConfirmResult> {
    const subscriptionResult = await this.confirmSubscription.execute(token);
    if (subscriptionResult) {
      return { kind: "subscription", subscriber: subscriptionResult };
    }

    const emailChangeResult = await this.confirmEmailChange.execute(token);
    if (emailChangeResult) {
      return { kind: "email_change", subscriber: emailChangeResult };
    }

    return { kind: "invalid" };
  }
}
