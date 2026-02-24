import { Hono } from "hono";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { renderer } from "./renderer";
import { routes } from "./routes";

const app = new Hono();

app.use(renderer);

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
