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

**Server → SSR → Client Hydration flow:**

1. `src/index.tsx` — Hono server routes and middleware (entry point for Workers)
2. `src/renderer.tsx` — React SSR renderer, generates HTML shell with asset injection
3. `src/client/index.tsx` — Client hydration entry point
4. `src/client/app.tsx` — Root React component for the client

**Key directories:**
- `src/client/` — Client-side React code (hydration, styles, components)
- `src/lib/` — Shared utilities (e.g., `cn()` class merge helper)
- `src/components/ui/` — shadcn/ui components (added via `pnpm dlx shadcn@latest add`)
- `tests/` — Vitest tests using Cloudflare Workers pool

**Styling:** TailwindCSS v4 with design tokens defined as CSS custom properties in `src/client/style.css`. Uses oklch color space. Dark mode via `.dark` class.

**UI Components:** shadcn/ui (new-york style) with Radix UI primitives. Config in `components.json`.

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Server:** Hono
- **UI:** React 19 with SSR + hydration via `vite-ssr-components`
- **Build:** Vite 7 with `@cloudflare/vite-plugin`
- **Styling:** TailwindCSS v4, class-variance-authority, tailwind-merge
- **Testing:** Vitest with `@cloudflare/vitest-pool-workers` (tests run in Worker environment)
- **Storage:** Cloudflare D1 (SQLite)
- **Path alias:** `@` → `./src` (configured in both tsconfig.json and vite.config.ts)

## Testing Conventions

- Test files go in `tests/` with `.spec.ts` extension
- Tests run inside the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`
- Import test utilities from `cloudflare:test` (not `vitest` globals for worker-specific APIs)
- Vitest config references `wrangler.jsonc` for worker bindings

## Adding Routes

Hono routes are defined in `src/index.tsx`. API routes should use `/api/*` prefix. Admin routes use `/admin/*` prefix (protected by Cloudflare Zero Trust Access).
