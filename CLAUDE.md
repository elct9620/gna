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
pnpm db:generate      # Generate Drizzle migration from schema changes
pnpm db:migrate       # Apply migrations to local D1
pnpm db:migrate:remote # Apply migrations to remote D1
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

- `src/api/` — Hono sub-app route handlers (`subscription.ts`, `profile.ts`, `confirm.ts`, `admin.ts`)
- `src/client/` — Client-side React code: hydration entry (`index.tsx`), page components (`admin.tsx`, `app.tsx`, `unsubscribe.tsx`), styles
- `src/components/` — Shared React components (internal, kebab-case naming)
- `src/components/ui/` — shadcn/ui components (added via `pnpm dlx shadcn@latest add`)
- `src/db/` — Drizzle ORM schema (`schema.ts`) with `subscribers` table definition
- `src/emails/` — React Email templates (`base-email.tsx` + specific emails), rendered server-side by `EmailRenderer`
- `src/entities/` — Domain models (e.g., `Subscriber` with readonly properties and computed status getters)
- `src/lib/` — Shared utilities (`cn()` class merge helper, `uuidv7()` ID generator, `validation.ts` for `EMAIL_REGEX`)
- `src/middleware/` — Hono middleware (e.g., `adminAuth.ts` for JWT verification)
- `src/repository/` — Data access layer implementing port interfaces (e.g., `SubscriberRepository`)
- `src/services/` — Infrastructure services (`EmailRenderer`, `EmailSender`, `NotificationService`, `Logger`, `AdminAuthService`)
- `src/use-cases/` — CQRS commands and queries (business logic)
- `src/use-cases/ports/` — Port interfaces for dependency inversion (`ISubscriberRepository`, `IEmailDelivery`)
- `tests/` — Vitest integration tests using Cloudflare Workers pool
- `tests/helpers/` — Test utilities (`MockEmailSender`, `MockLogger`)
- `drizzle/` — Generated D1 migration SQL files (via `pnpm db:generate`)

### CQRS Use Cases

Business logic lives in `src/use-cases/` as Commands (mutate state) and Queries (read-only):

- **Commands:** `SubscribeCommand`, `ConfirmSubscriptionCommand`, `UpdateProfileCommand`, `UnsubscribeCommand`, `RemoveSubscriberCommand`, `RequestMagicLinkCommand`, `ConfirmEmailChangeCommand`, `SendConfirmationEmailCommand`, `SendMagicLinkEmailCommand`, `SendEmailChangeConfirmationCommand`, `SendTestEmailCommand`
- **Queries:** `ListSubscribersQuery`, `ValidateMagicLinkQuery`

Use cases depend on **port interfaces** (`src/use-cases/ports/`), not concrete implementations:

- `ISubscriberRepository` — data access abstraction (implemented by `SubscriberRepository`)
- `IEmailDelivery` — email sending abstraction (implemented by `NotificationService`)

Commands return typed result objects with action descriptors (e.g., `{ subscriber, action: "created" | "resend" | "none" }`). Queries return values or null. API routes resolve use cases from the container and orchestrate them.

### Dependency Injection

tsyringe container is configured in `src/container.ts` and imported at the top of `src/index.tsx`. Services are resolved via `container.resolve(ServiceClass)`.

**esbuild limitation:** Vite uses esbuild which does not support `emitDecoratorMetadata`, so tsyringe's `@inject()` decorator cannot resolve constructor parameters. Two registration patterns coexist:

| Pattern   | Registration                              | When to use                                    | Examples                                                   |
| --------- | ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| Singleton | `registerSingleton()`                     | No constructor deps                            | `EmailRenderer`, `Logger`                                  |
| Factory   | `register()` + `instanceCachingFactory()` | Needs env values, constructor deps, or caching | Use cases, repositories, `EmailSender`, `AdminAuthService` |

Non-class dependencies use exported `Symbol` tokens (e.g. `DATABASE`, `AWS_CLIENT`, `AWS_REGION`, `FROM_ADDRESS`, `BASE_URL`). Notification commands (e.g., `SendConfirmationEmailCommand`) use factory without caching to get fresh instances.

### Database

- **Storage:** Cloudflare D1 (SQLite) via Drizzle ORM
- **Schema:** `src/db/schema.ts` — `subscribers` table with UUIDv7 primary keys (custom `src/lib/uuidv7.ts`), email, nickname, confirmation/magic-link tokens with expiry, pending email change fields
- **Schema conventions:** Primary keys use `uuidv7()`, timestamps stored as ISO strings via `$defaultFn(() => new Date().toISOString())`, unique indexes named `idx_tablename_fieldname`, token fields have associated `ExpiresAt` columns
- **Config:** `drizzle.config.ts` (schema + output dir), `wrangler.jsonc` (`migrations_dir: "drizzle"`)
- **Workflow:** Edit schema → `pnpm db:generate` → `pnpm db:migrate` (local) or `pnpm db:migrate:remote` (production)

### Email Services

- `NotificationService` — Implements `IEmailDelivery` port; composes `EmailRenderer` + `EmailSender`
- `EmailRenderer` — Renders React Email components to HTML and plain text via `@react-email/render`
- `EmailSender` — Wraps AWS SES v2 API via `aws4fetch` for v4 request signing
- Email templates extend `BaseEmail` component with props: `previewText`, `heading`, `bodyText`, `actionUrl`, `actionText`
- `Logger` — Simple abstraction over `console.*` methods (`error`, `warn`, `info`); registered as singleton

### Hono RPC Client

Client-side code uses Hono's type-safe RPC client for API calls:

- Server exports `AppType` from `src/index.tsx`
- Client creates `hc<AppType>("/")` for type-safe API calls
- Use `InferResponseType<typeof client.endpoint.$method>` for response types

### Environment Variables

- Public config goes in `wrangler.jsonc` under `vars`
- Secrets go in `.dev.vars` for local development (gitignored), and via `wrangler secret put` for production
- `pnpm cf-typegen` regenerates `worker-configuration.d.ts` from **both** sources — never edit this file manually
- Access env values in code via `import { env } from "cloudflare:workers"`

### API Route Conventions

- API routes are Hono sub-apps in `src/api/*.ts`, mounted in `src/index.tsx` before the catch-all handler
- Error responses: `return c.json({ error: "message" }, statusCode)`
- Request validation: `c.req.query()` for query params, `await c.req.json<Type>()` for body
- Resolve use cases inline: `const command = container.resolve(SubscribeCommand)`
- Typical flow: resolve use case → execute → conditionally resolve notification command → return JSON

### Entity and Repository Patterns

- Entities use readonly properties and immutable design (constructed from a `Data` interface)
- `Subscriber` entity has computed getters: `status`, `isActivated`, `isPending`, `isConfirmationExpired`, `isMagicLinkExpired`
- `SubscriberRepository` converts DB rows to entities via a private `toSubscriberEntity()` helper — never exposes raw Drizzle rows

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
- **Storage:** Cloudflare D1 (SQLite) via Drizzle ORM. Schema in `src/db/schema.ts`, config in `drizzle.config.ts`.
- **Email:** React Email templates rendered server-side, sent via AWS SES (aws4fetch)
- **DI:** tsyringe with `reflect-metadata`. Decorator-based for most services; factory-based for env/context dependencies (esbuild limitation). Container setup in `src/container.ts`.
- **Auth:** Cloudflare Zero Trust JWT verification via `jose`. Service in `src/services/admin-auth-service.ts`.
- **Path alias:** `@` → `./src` (configured in tsconfig.json, vite.config.ts, and vitest.config.ts)

## Naming Conventions

- Internal TypeScript files use **kebab-case** (e.g. `error-boundary.tsx`, `feed-parser.ts`)
- shadcn/ui generated files keep their original kebab-case naming (e.g. `button.tsx`, `card.tsx`)

## Testing Conventions

- **Coverage target: 80%+**
- **Integration tests preferred** over unit tests — test through the Hono `app.request()` API to exercise the full server stack
- Test files go in `tests/` with `.spec.ts` extension
- Tests run inside the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`
- Import test utilities from `cloudflare:test` for worker-specific APIs (e.g. `env` bindings)
- `tests/setup.ts` imports `reflect-metadata`, applies D1 migrations globally, and silences console output (spies on `log`/`info`/`warn`/`error`)
- Vitest config references `wrangler.jsonc` for worker bindings; uses `singleWorker: true` to avoid spawning too many workerd processes
- Override env bindings in integration tests via the third argument to `app.request()`: `app.request("/path", {}, { ...env, DISABLE_AUTH: "true" })`
- Mock services by re-registering on the tsyringe container: `container.register(EmailSender, { useValue: mockInstance })`
- Radix UI transitive dependencies (`react-remove-scroll`, `react-remove-scroll-bar`) must be listed in `vitest.config.ts` under `test.deps.optimizer.ssr.include` and as explicit devDependencies, otherwise workerd cannot resolve their bare specifier imports
- Do not add packages to `test.deps.optimizer.ssr.include` preemptively — only add them when tests actually fail without it
