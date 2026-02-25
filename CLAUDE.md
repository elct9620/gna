# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gna is a lightweight, self-hosted newsletter platform running on Cloudflare Workers. It replaces Mailchimp by automatically generating newsletters from RSS feeds, with subscription management via an embeddable CORS API. See `SPEC.md` for full specification.

## Commands

```bash
pnpm dev              # Start Vite dev server with HMR
pnpm build            # Production build
pnpm preview          # Build + preview production locally
pnpm deploy           # Build + deploy to Cloudflare Workers
pnpm test             # Run tests (vitest run)
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with Istanbul coverage
pnpm typecheck        # TypeScript type checking (tsc)
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting
pnpm cf-typegen       # Regenerate Cloudflare Worker types
```

Run a single test file:

```bash
pnpm vitest run tests/index.spec.ts
```

## Architecture

### Request Lifecycle

```
Request → Hono middleware (renderer) → React Router static handler → SSR → HTML Response
                                                                           ↓
Client loads → createBrowserRouter (hydrationData) → RouterProvider → Interactive
```

1. `src/index.tsx` — Hono server with `createStaticHandler` catch-all route. Converts `c.req.raw` to React Router context, sets HTTP status from `context.statusCode`, renders via `StaticRouterProvider`.
2. `src/renderer.tsx` — `@hono/react-renderer` HTML shell with Vite asset injection (`ViteClient`, `Script`, `Link`). Receives React Router output as `children`.
3. `src/routes.tsx` — **Shared route definitions** (`RouteObject[]`) used by both server and client. Single source of truth for all page routes.
4. `src/client/index.tsx` — Client hydration via `createBrowserRouter` + `RouterProvider`, reads `window.__staticRouterHydrationData`.

### Key Directories

- `src/client/` — Client-side React code: hydration entry (`index.tsx`), page components (`admin.tsx`, `app.tsx`, `unsubscribe.tsx`), styles
- `src/components/` — Shared React components (internal, camelCase naming)
- `src/components/ui/` — shadcn/ui components (added via `pnpm dlx shadcn@latest add`)
- `src/db/` — Drizzle ORM schema definitions (`schema.ts`) — currently a placeholder; no tables defined yet
- `src/hooks/` — React hooks (e.g., `use-mobile.ts` from shadcn/ui)
- `src/lib/` — Shared utilities (e.g., `cn()` class merge helper)
- `src/middleware/` — Hono middleware (e.g., `adminAuth.ts` for JWT verification)
- `src/services/` — Business logic services (e.g., `adminAuthService.ts`, `subscriptionService.ts`)
- `tests/` — Vitest integration tests using Cloudflare Workers pool (mirrors `src/` structure)

### Dependency Injection

tsyringe container is configured in `src/container.ts` and imported at the top of `src/index.tsx`. Services are resolved via `container.resolve(ServiceClass)`.

**esbuild limitation:** Vite uses esbuild which does not support `emitDecoratorMetadata`, so tsyringe's `@inject()` decorator cannot resolve constructor parameters. Three registration patterns coexist:

| Pattern              | Registration                               | When to use                                                    | Examples                                |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------- | --------------------------------------- |
| Decorator + register | `@injectable()` + `registerSingleton()`    | Pure business logic with constructor deps                      | `EmailRenderer`, `SubscriptionService`  |
| Decorator only       | `@injectable()` (no explicit registration) | No constructor deps; resolved ad-hoc via `container.resolve()` | `AdminAuthService`                      |
| Factory              | `register()` + `instanceCachingFactory()`  | Needs env values, external SDK instances, or caching           | `DATABASE`, `AWS_CLIENT`, `EmailSender` |

Most services will be **decorator-based**. Use factory registration when the service depends on `env`, wraps a third-party client, or needs singleton caching. Non-class dependencies use exported `Symbol` tokens (e.g. `DATABASE`, `AWS_CLIENT`, `AWS_REGION`, `FROM_ADDRESS`). Scalar env values injected into services also use Symbol tokens registered via factory.

### Environment Variables

- Public config goes in `wrangler.jsonc` under `vars`
- Secrets go in `.dev.vars` for local development (gitignored), and via `wrangler secret put` for production
- `pnpm cf-typegen` regenerates `worker-configuration.d.ts` from **both** sources — never edit this file manually
- Access env values in code via `import { env } from "cloudflare:workers"`

### Adding Routes

Add new routes to `src/routes.tsx`. Both server SSR and client hydration share this file. API routes (`/api/*`) and admin routes (`/admin/*`) should be registered in `src/index.tsx` **before** the catch-all `app.all("*")` handler.

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Server:** Hono
- **Routing:** React Router v7 (Data Mode SSR — `createStaticHandler`/`createBrowserRouter`)
- **UI:** React 19 with SSR + hydration via `vite-ssr-components`
- **Build:** Vite 7 with `@cloudflare/vite-plugin`
- **Styling:** TailwindCSS v4, class-variance-authority, tailwind-merge
- **UI Components:** shadcn/ui (new-york style, Radix UI primitives, Lucide icons). Config in `components.json`.
- **Testing:** Vitest with `@cloudflare/vitest-pool-workers` (tests run in Worker environment)
- **Storage:** Cloudflare D1 (SQLite) via Drizzle ORM. Schema in `src/db/schema.ts`, config in `drizzle.config.ts`. Note: D1 schema is currently a placeholder; `SubscriptionService` uses in-memory storage pending migration.
- **DI:** tsyringe with `reflect-metadata`. Decorator-based for most services; factory-based for env/context dependencies (esbuild limitation). Container setup in `src/container.ts`.
- **Auth:** Cloudflare Zero Trust JWT verification via `jose`. Service in `src/services/adminAuthService.ts`.
- **Path alias:** `@` → `./src` (configured in tsconfig.json, vite.config.ts, and vitest.config.ts)

## Naming Conventions

- Internal TypeScript files use **camelCase** (e.g. `errorBoundary.tsx`, `feedParser.ts`)
- shadcn/ui generated files keep their original lowercase naming (e.g. `button.tsx`, `card.tsx`)

## Testing Conventions

- **Coverage target: 80%+**
- **Integration tests preferred** over unit tests — test through the Hono `app.request()` API to exercise the full server stack
- Test files go in `tests/` with `.spec.ts` extension
- Tests run inside the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`
- Import test utilities from `cloudflare:test` for worker-specific APIs (e.g. `env` bindings)
- `tests/setup.ts` imports `reflect-metadata` globally for tsyringe decorator support in tests
- Vitest config references `wrangler.jsonc` for worker bindings
- Override env bindings in integration tests via the third argument to `app.request()`: `app.request("/path", {}, { ...env, DISABLE_AUTH: "true" })`
- Radix UI transitive dependencies (`react-remove-scroll`, `react-remove-scroll-bar`) must be listed in `vitest.config.ts` under `test.deps.optimizer.ssr.include` and as explicit devDependencies, otherwise workerd cannot resolve their bare specifier imports
- Do not add packages to `test.deps.optimizer.ssr.include` preemptively — only add them when tests actually fail without it
