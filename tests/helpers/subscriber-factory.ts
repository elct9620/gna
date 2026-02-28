import type { SubscribeCommand } from "@/use-cases/subscribe-command";
import type { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";

export async function createActiveSubscriber(
  subscribe: SubscribeCommand,
  confirmSubscription: ConfirmSubscriptionCommand,
  email: string,
  nickname?: string,
) {
  const { subscriber } = await subscribe.execute(email, nickname);
  await confirmSubscription.execute(subscriber.confirmationToken!);
  return subscriber;
}
