import { Hono } from "hono";
import { container } from "@/container";
import { SubscriptionService } from "@/services/subscriptionService";

const app = new Hono()
  .get("/subscribers", async (c) => {
    const service = container.resolve(SubscriptionService);
    const subscribers = await service.listSubscribers();

    return c.json({
      subscribers: subscribers.map((s) => ({
        email: s.email,
        nickname: s.nickname,
        status: s.status,
      })),
    });
  })
  .delete("/subscribers/:email", async (c) => {
    const email = c.req.param("email");
    const service = container.resolve(SubscriptionService);
    const removed = await service.removeSubscriber(email);

    if (!removed) {
      return c.json({ error: "Subscriber not found" }, 404);
    }

    return c.json({ message: "Subscriber removed" });
  });

export default app;
