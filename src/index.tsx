import { Hono } from "hono";
import { renderer } from "./renderer";

const app = new Hono();

app.use(renderer);

app.get("/", (c) => {
  return c.render(
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <h1 class="text-4xl font-bold text-blue-600">Hello!</h1>
    </div>
  );
});

export default app;
