import type { RouteObject } from "react-router";
import { App } from "./client/app";
import { ErrorBoundary } from "./components/errorBoundary";

export const routes: RouteObject[] = [
  { path: "/", Component: App, ErrorBoundary },
];
