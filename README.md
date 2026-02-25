# Gna

A lightweight, self-hosted newsletter platform running on Cloudflare Workers. Designed for [Aotokitsuruya's Blog](https://blog.aotoki.me) as a Mailchimp replacement.

Gna automatically generates newsletters from RSS feed updates and provides subscription management through an embeddable CORS API.

## Features

| Feature               | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| RSS-to-Newsletter     | Automatically generates and sends newsletters from RSS entries |
| Subscription API      | CORS-enabled REST API embeddable on any website                |
| Admin Dashboard       | Subscriber management protected by Cloudflare Zero Trust       |
| Newsletter Publishing | Manual composition with immediate send or scheduled delivery   |

## Tech Stack

| Category | Technology                          |
| -------- | ----------------------------------- |
| Runtime  | Cloudflare Workers                  |
| Server   | Hono                                |
| UI       | React 19 (SSR + client hydration)   |
| Build    | Vite 7                              |
| Styling  | TailwindCSS v4 + shadcn/ui          |
| Storage  | Cloudflare D1 (SQLite)              |
| Testing  | Vitest with Cloudflare Workers pool |

## Getting Started

### Prerequisites

| Requirement                                        | Version |
| -------------------------------------------------- | ------- |
| [Node.js](https://nodejs.org/)                     | v18+    |
| [pnpm](https://pnpm.io/)                           | latest  |
| [Cloudflare account](https://dash.cloudflare.com/) | —       |

### Setup

```bash
pnpm install
pnpm dev
```

### AWS SES

Email delivery uses AWS SES v2 via [aws4fetch](https://github.com/mhart/aws4fetch).

1. Verify your sending domain in the [SES Console](https://console.aws.amazon.com/ses/)
2. Create an IAM user with a scoped policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:<REGION>:<ACCOUNT_ID>:identity/<DOMAIN>"
    }
  ]
}
```

3. Generate an Access Key for the user and configure it as secrets:

```bash
pnpm wrangler secret put AWS_ACCESS_KEY_ID
pnpm wrangler secret put AWS_SECRET_ACCESS_KEY
```

`AWS_REGION` and `FROM_ADDRESS` are configured in `wrangler.jsonc` under `vars`.

### Commands

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Start Vite dev server with HMR       |
| `pnpm build`         | Production build                     |
| `pnpm preview`       | Build + preview production locally   |
| `pnpm deploy`        | Build + deploy to Cloudflare Workers |
| `pnpm test`          | Run tests                            |
| `pnpm test:watch`    | Run tests in watch mode              |
| `pnpm test:coverage` | Run tests with coverage              |
| `pnpm typecheck`     | TypeScript type checking             |
| `pnpm format`        | Format code with Prettier            |
| `pnpm cf-typegen`    | Regenerate Cloudflare Worker types   |

## License

[Apache-2.0](LICENSE)
