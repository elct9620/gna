import type { SubscribeCommand } from "@/use-cases/subscribe-command";
import type { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";

export async function createActiveSubscriber(
  subscribe: SubscribeCommand,
  confirmSubscription: ConfirmSubscriptionCommand,
  email: string,
  nickname?: string,
) {
  const result = await subscribe.execute(email, nickname);
  if (result.action === "invalid_email") {
    throw new Error("Test setup failed: invalid email");
  }
  await confirmSubscription.execute(result.subscriber.confirmationToken!);
  return result.subscriber;
}
