import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import type { HydrationState } from "react-router";
import { routes } from "../routes";

declare global {
  interface Window {
    __staticRouterHydrationData?: HydrationState;
  }
}

const router = createBrowserRouter(routes, {
  hydrationData: window.__staticRouterHydrationData,
});

hydrateRoot(
  document.getElementById("root")!,
  <RouterProvider router={router} />,
);
