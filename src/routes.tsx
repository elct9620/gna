import type { RouteObject } from "react-router";
import { Admin } from "./client/admin";
import { App } from "./client/app";
import { Unsubscribe } from "./client/unsubscribe";
import { ErrorBoundary } from "./components/errorBoundary";

export const routes: RouteObject[] = [
  { path: "/", Component: App, ErrorBoundary },
  { path: "/admin", Component: Admin, ErrorBoundary },
  { path: "/unsubscribe", Component: Unsubscribe, ErrorBoundary },
];
