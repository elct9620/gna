import "reflect-metadata";
import "@/container";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import subscriptionApi from "./api/subscription";
import confirmApi from "./api/confirm";
import profileApi from "./api/profile";
import adminApi from "./api/admin";
import { adminAuth } from "./middleware/admin-auth";
import { renderer } from "./renderer";
import { routes } from "./routes";

const app = new Hono<{ Bindings: Env }>();

app.use(renderer);

app.use("/api/*", cors());

app.use("/admin/*", adminAuth);
app.use("/admin", adminAuth);

const apiRoutes = app
  .route("/api", subscriptionApi)
  .route("/api/profile", profileApi)
  .route("/confirm", confirmApi)
  .route("/admin/api", adminApi);

const { query, dataRoutes } = createStaticHandler(routes);

app.all("*", async (c) => {
  const context = await query(c.req.raw);

  if (context instanceof Response) {
    return context;
  }

  const router = createStaticRouter(dataRoutes, context);

  c.status(context.statusCode as 200);
  return c.render(<StaticRouterProvider router={router} context={context} />);
});

export default app;
export type AppType = typeof apiRoutes;
