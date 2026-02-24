import "reflect-metadata";
import "@/container";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { container } from "@/container";
import { adminAuth } from "./middleware/adminAuth";
import { renderer } from "./renderer";
import { routes } from "./routes";
import { SubscriptionService } from "./services/subscriptionService";

const app = new Hono<{ Bindings: Env }>();

app.use(renderer);

app.use("/api/*", cors());

app.use("/admin/*", adminAuth);
app.use("/admin", adminAuth);

app.post("/api/subscribe", async (c) => {
  const service = container.resolve(SubscriptionService);
  const body = await c.req.json<{ email?: string; nickname?: string }>();

  try {
    service.subscribe(body.email ?? "", body.nickname);
  } catch {
    return c.json({ error: "Invalid email address" }, 400);
  }

  return c.json({ message: "Subscribed successfully" }, 201);
});

app.get("/api/unsubscribe", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "Missing token" }, 400);
  }

  const service = container.resolve(SubscriptionService);
  service.unsubscribe(token);

  return c.redirect("/unsubscribe?status=success", 302);
});

const { query, dataRoutes } = createStaticHandler(routes);

app.all("*", async (c) => {
  const context = await query(c.req.raw);

  if (context instanceof Response) {
    return context;
  }

  const router = createStaticRouter(dataRoutes, context);

  c.status(context.statusCode as 200);
  return c.render(
    <StaticRouterProvider router={router} context={context} />,
  );
});

export default app;
