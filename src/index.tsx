import { Hono } from "hono";
import { App } from "./client/app";
import { renderer } from "./renderer";

const app = new Hono();

app.use(renderer);

app.get("/", (c) => {
  return c.render(<App />);
});

export default app;
