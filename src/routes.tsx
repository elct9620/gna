import type { RouteObject } from "react-router";
import { Admin } from "./client/admin";
import { App } from "./client/app";
import { Confirmed } from "./client/confirmed";
import { Profile } from "./client/profile";
import { Unsubscribe } from "./client/unsubscribe";
import { ErrorBoundary } from "./components/errorBoundary";

export const routes: RouteObject[] = [
  { path: "/", Component: App, ErrorBoundary },
  { path: "/admin", Component: Admin, ErrorBoundary },
  { path: "/confirmed", Component: Confirmed, ErrorBoundary },
  { path: "/profile", Component: Profile, ErrorBoundary },
  { path: "/unsubscribe", Component: Unsubscribe, ErrorBoundary },
];
