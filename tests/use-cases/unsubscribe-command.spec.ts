import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import type { IAppConfig } from "@/use-cases/ports/config";
import { SubscribeCommand } from "@/use-cases/subscribe-command";
import { ConfirmSubscriptionCommand } from "@/use-cases/confirm-subscription-command";
import { UnsubscribeCommand } from "@/use-cases/unsubscribe-command";
import { ListSubscribersQuery } from "@/use-cases/list-subscribers-query";
import { SubscriberRepository } from "@/repository/subscriber-repository";
import { subscribers } from "@/db/schema";
import { createActiveSubscriber } from "../helpers/subscriber-factory";

describe("UnsubscribeCommand", () => {
  let repo: SubscriberRepository;
  let subscribe: SubscribeCommand;
  let confirmSubscription: ConfirmSubscriptionCommand;
  let unsubscribe: UnsubscribeCommand;
  let listSubscribers: ListSubscribersQuery;

  const config: IAppConfig = {
    baseUrl: "https://test.example.com",
    confirmationTtlMs: 24 * 60 * 60 * 1000,
    magicLinkTtlMs: 15 * 60 * 1000,
  };

  beforeEach(async () => {
    const db = drizzle(env.DB);
    await db.delete(subscribers);
    repo = new SubscriberRepository(db);
    subscribe = new SubscribeCommand(repo, config);
    confirmSubscription = new ConfirmSubscriptionCommand(repo);
    unsubscribe = new UnsubscribeCommand(repo);
    listSubscribers = new ListSubscribersQuery(repo);
  });

  it("should remove subscriber", async () => {
    const sub = await createActiveSubscriber(
      subscribe,
      confirmSubscription,
      "test@example.com",
    );

    await unsubscribe.execute(sub.unsubscribeToken);

    expect(await listSubscribers.execute()).toHaveLength(0);
    expect(await repo.existsByEmail("test@example.com")).toBe(false);
  });
});
