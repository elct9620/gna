import type { RouteObject } from "react-router";
import { Admin } from "./client/admin";
import { App } from "./client/app";
import { Confirmed } from "./client/confirmed";
import { Profile } from "./client/profile";
import { TestEmail } from "./client/testEmail";
import { Unsubscribe } from "./client/unsubscribe";
import { ErrorBoundary } from "./components/errorBoundary";

export const routes: RouteObject[] = [
  { path: "/", Component: App, ErrorBoundary },
  { path: "/admin", Component: Admin, ErrorBoundary },
  { path: "/admin/test-email", Component: TestEmail, ErrorBoundary },
  { path: "/confirmed", Component: Confirmed, ErrorBoundary },
  { path: "/profile", Component: Profile, ErrorBoundary },
  { path: "/unsubscribe", Component: Unsubscribe, ErrorBoundary },
];
