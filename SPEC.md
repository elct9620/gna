# Gna — Lightweight Newsletter Platform

## Purpose

Gna is a self-hosted newsletter platform running on Cloudflare Workers that replaces Mailchimp for content creators who publish via RSS feeds. It automatically generates and sends newsletters from RSS feed updates, providing subscription management through an embeddable CORS API.

## Users

| User                    | Description                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Content Creator (Admin) | Blog or website owner who publishes content via RSS and wants to offer email newsletters. Acts as the administrator of the platform. |
| Subscriber              | Reader who subscribes to receive email updates from the content creator's site.                                                      |
| Visitor                 | Anonymous site visitor who may choose to subscribe via the embedded form.                                                            |

In most deployments, there is a single Content Creator who is also the Administrator.

## Impacts

| Area                    | Before (Mailchimp)                         | After (Gna)                                |
| ----------------------- | ------------------------------------------ | ------------------------------------------ |
| Newsletter creation     | Manual composition in third-party platform | Automatic generation from RSS feed entries |
| Subscription management | Platform-dependent, vendor lock-in         | Self-hosted API, embeddable on any site    |
| Cost                    | Monthly subscription fee                   | Cloudflare Workers free/paid tier only     |
| Authentication          | Separate platform credentials              | Cloudflare Zero Trust, no custom auth      |
| Integration             | Platform-specific widgets                  | CORS-enabled REST API for any origin       |

## Success Criteria

- A visitor can subscribe via the embedded API, receive a confirmation email, and activate the subscription by clicking the confirmation link (double opt-in).
- New RSS feed entries automatically trigger newsletter generation within the configured schedule.
- Newsletters are delivered to all active subscribers with correct content.
- The admin dashboard is accessible only through Cloudflare Zero Trust authentication.
- The admin can manually compose, schedule, and send newsletters.
- A subscriber can authenticate via Magic Link and update their nickname and email address.

---

## Features

### 1. Subscription API

Embeddable CORS-enabled REST API allowing visitors on any website to subscribe to and unsubscribe from newsletters.

### 2. Subscriber Management

Admin interface for viewing, searching, and managing the subscriber list.

### 3. RSS Feed Newsletter Generation

Automated system that monitors RSS feeds and generates newsletters from new entries, triggered by Cron schedule or webhook push.

### 4. Admin Authentication

Management dashboard protected by Cloudflare Zero Trust Access, requiring no custom authentication implementation.

### 5. Newsletter Publishing & Scheduling

Manual newsletter composition with immediate send or scheduled delivery.

### 6. Subscriber Profile Management

Subscribers can manage their own profile (nickname and email address) through a passwordless Magic Link authentication flow. After verifying identity via email, subscribers can update their nickname immediately and request an email address change with confirmation.

---

## User Journeys

### Visitor Subscribes

**Context:** A visitor is reading a blog post and sees a subscription form embedded on the page.

**Action:** The visitor enters their email address and submits the form. The system sends a confirmation email to the provided address. The visitor clicks the confirmation link in the email.

**Outcome:** The subscription is activated. The visitor is now an active subscriber and will receive future newsletters.

### Subscriber Unsubscribes

**Context:** A subscriber receives a newsletter email containing an unsubscribe link.

**Action:** The subscriber clicks the unsubscribe link.

**Outcome:** The system deletes the subscriber record and displays a confirmation page. The subscriber no longer receives newsletters.

### RSS Feed Triggers Newsletter

**Context:** The content creator publishes a new blog post, which updates the RSS feed.

**Action:** On the next scheduled Cron run (or via incoming webhook), the system detects new RSS entries.

**Outcome:** The system generates a newsletter from the new entries and delivers it to all active subscribers.

### Admin Manages Subscribers

**Context:** The administrator accesses the management dashboard, authenticated via Cloudflare Zero Trust.

**Action:** The admin views the subscriber list, searches for a subscriber, or removes an entry.

**Outcome:** The subscriber list is updated accordingly.

### Admin Publishes Newsletter Manually

**Context:** The administrator wants to send a one-off newsletter not derived from RSS content.

**Action:** The admin composes a newsletter in the dashboard and chooses to send immediately or schedule for later.

**Outcome:** The newsletter is delivered to all active subscribers at the specified time.

### Subscriber Accesses Profile

**Context:** A subscriber wants to update their profile. They follow a profile link in a newsletter or visit the profile page directly.

**Action:** The subscriber enters their email address. The system sends a Magic Link to that address. The subscriber clicks the link in the email.

**Outcome:** The subscriber is authenticated and sees a profile editing page displaying their current email and nickname.

### Subscriber Updates Nickname

**Context:** An authenticated subscriber is on the profile editing page.

**Action:** The subscriber enters a new nickname and saves the change.

**Outcome:** The nickname is updated immediately. Subsequent newsletters use the new nickname for personalization.

### Subscriber Updates Email

**Context:** An authenticated subscriber is on the profile editing page.

**Action:** The subscriber enters a new email address. The system sends a confirmation email to the new address. The subscriber clicks the confirmation link.

**Outcome:** The subscriber's email is updated to the new address. Subsequent newsletters are delivered to the new email.

---

## Feature Behaviors

### 1. Subscription API

#### Subscribe

| Field               | Rule                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint            | `POST /api/subscribe`                                                                                                                  |
| Request body        | `{ "email": "<address>", "nickname": "<name>" }` (`nickname` is optional)                                                              |
| CORS                | Allow origins configured per deployment                                                                                                |
| Validation          | Reject syntactically invalid email addresses (RFC 5321 addr-spec); if `nickname` provided, must be 1–50 characters                     |
| New subscription    | Create subscriber record with `activated_at = NULL`; generate confirmation token; send confirmation email                              |
| Duplicate (active)  | Email already activated (`activated_at IS NOT NULL`) — return success without action (idempotent; does not reveal subscription status) |
| Duplicate (pending) | Email exists but not activated (`activated_at IS NULL`) — regenerate confirmation token and resend confirmation email; return success  |
| Success response    | `201 Created` — `{ "status": "confirmation_sent" }`                                                                                    |
| Validation failure  | `400 Bad Request` — `{ "error": "<reason>" }`                                                                                          |

#### Unsubscribe

| Field           | Rule                                                            |
| --------------- | --------------------------------------------------------------- |
| Endpoint        | `GET /api/unsubscribe?token=<token>`                            |
| Token           | Unique per-subscriber token, included in every newsletter email |
| Valid token     | Delete subscriber record; display confirmation page             |
| Invalid token   | Display error page with contact instructions                    |
| Token not found | Display confirmation page (idempotent)                          |

#### Rate Limiting

| Rule                      | Value                   |
| ------------------------- | ----------------------- |
| Subscribe requests per IP | 5 per minute            |
| Exceeded limit            | `429 Too Many Requests` |

### 2. Subscriber Management

#### Subscriber States

```
[created] ──(confirm)──▶ active ──(unsubscribe)──▶ [deleted]
[created] ──(token expired + cleanup)──▶ [deleted]
active ──(admin remove)──▶ [deleted]
```

| State       | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `[created]` | Record exists but `activated_at` is `NULL`; awaiting email confirmation |
| `active`    | `activated_at IS NOT NULL`; receiving newsletters                       |
| `[deleted]` | Record removed from the database                                        |

#### Subscriber Fields

| Field               | Required | Description                                                            |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| `email`             | Yes      | Subscriber's email address                                             |
| `nickname`          | No       | Display name for personalization and admin display                     |
| `unsubscribe_token` | Yes      | Unique token for authenticating unsubscribe                            |
| `activated_at`      | No       | Timestamp of subscription confirmation; `NULL` means not yet activated |

#### Admin Operations

| Operation        | Behavior                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| List subscribers | Paginated list; shows all subscribers (active and pending); displays email, nickname, and activation status |
| Search           | Filter by email or nickname (partial match)                                                                 |
| Remove           | Hard delete from database                                                                                   |
| Export           | Download subscriber list as CSV                                                                             |

### 3. RSS Feed Newsletter Generation

#### Feed Monitoring

| Field               | Rule                                                                |
| ------------------- | ------------------------------------------------------------------- |
| Trigger             | Cloudflare Cron Trigger on configured schedule, or incoming webhook |
| Feed URL            | Configured per deployment (single feed)                             |
| New entry detection | Compare entry published timestamps against last processed timestamp |
| New entries found   | Proceed to newsletter generation                                    |
| No new entries      | Log the check; take no further action                               |

#### Newsletter Generation

| Field             | Rule                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Content per entry | Title, summary or excerpt, and link to full article                                                                                   |
| Batching          | All new entries since last check are combined into one newsletter                                                                     |
| Template          | Render entries into email HTML using a configured template                                                                            |
| Personalization   | Template may include subscriber nickname (e.g., "Hi, {nickname}"); fallback to generic greeting (e.g., "Hi") when nickname is not set |
| Empty batch       | No newsletter generated                                                                                                               |

#### Delivery

| Field            | Rule                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| Recipients       | All subscribers with `activated_at IS NOT NULL`                             |
| Email headers    | Include `List-Unsubscribe` header with one-click unsubscribe URL (RFC 8058) |
| Email footer     | Include unsubscribe link and profile management link                        |
| Failure handling | Log failed deliveries; do not change subscriber state on transient failures |
| After delivery   | Update last processed timestamp to the latest entry                         |

### 4. Admin Authentication

#### JWT Verification

| Field                    | Rule                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Method                   | Cloudflare Zero Trust Access                                                                                          |
| Protected routes         | All routes under `/admin/*`                                                                                           |
| Token source             | `Cf-Access-Jwt-Assertion` request header                                                                              |
| Validation               | Verify signature against Cloudflare JWKS endpoint (`https://<team-domain>.cloudflareaccess.com/cdn-cgi/access/certs`) |
| Required claims          | `aud` must match the Application Audience (AUD) tag configured in Access; `exp` must be in the future                 |
| Authenticated request    | Proceed to route handler; user identity available from JWT claims (`email`, `sub`)                                    |
| Unauthenticated request  | `401 Unauthorized` with JSON error body                                                                               |
| Invalid or expired token | `403 Forbidden` with JSON error body                                                                                  |

#### Configuration

| Binding               | Type     | Description                                                 |
| --------------------- | -------- | ----------------------------------------------------------- |
| `CF_ACCESS_TEAM_NAME` | Variable | Cloudflare Access team domain (e.g. `myteam`)               |
| `CF_ACCESS_AUD`       | Variable | Application Audience (AUD) tag                              |
| `DISABLE_AUTH`        | Variable | Set to `"true"` to bypass authentication (development only) |

#### Development Bypass

| Field                | Rule                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| Condition            | `DISABLE_AUTH` variable equals `"true"`                              |
| Behavior             | Skip JWT verification; inject a synthetic identity (`dev@localhost`) |
| Scope                | All `/admin/*` routes                                                |
| Production safeguard | `DISABLE_AUTH` must NOT be set in production wrangler config         |

### 5. Newsletter Publishing & Scheduling

#### Manual Composition

| Field           | Rule                             |
| --------------- | -------------------------------- |
| Required fields | Subject line and body content    |
| Body format     | HTML with plain-text fallback    |
| Preview         | Admin can preview before sending |

#### Newsletter States

```
draft ──(schedule)──▶ scheduled ──(send time reached)──▶ sending ──(complete)──▶ sent
  ▲                       │
  └───(cancel schedule)───┘
```

| State       | Description                                   |
| ----------- | --------------------------------------------- |
| `draft`     | Being composed; not yet sent or scheduled     |
| `scheduled` | Queued for future delivery at a specific time |
| `sending`   | Currently being delivered to subscribers      |
| `sent`      | Delivery completed                            |

#### Schedule Operations

| Operation        | Rule                                                         |
| ---------------- | ------------------------------------------------------------ |
| Send immediately | Transition from `draft` to `sending`                         |
| Schedule         | Set future send time; transition from `draft` to `scheduled` |
| Cancel schedule  | Revert from `scheduled` to `draft`                           |
| Edit scheduled   | Allowed only while in `scheduled` state                      |
| Past send time   | Reject; require a future timestamp                           |

### 6. Subscriber Profile Management

#### Magic Link Authentication

| Field                            | Rule                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint                         | `POST /api/profile/request-link`                                                                                                            |
| Request body                     | `{ "email": "<address>" }`                                                                                                                  |
| Behavior                         | Generate a one-time token and send a Magic Link to the provided email address                                                               |
| Token lifetime                   | 15 minutes from creation                                                                                                                    |
| Token usage                      | Single-use; `GET /profile` validates but does not consume; consumed on `POST /api/profile/update` submission; also expires after 15 minutes |
| Repeat request                   | Invalidate any existing unexpired token; issue a new token                                                                                  |
| Email not found or not activated | Return success without sending email (prevent email enumeration; pending subscribers cannot access profile)                                 |
| Success response                 | `200 OK` — `{ "status": "link_sent" }`                                                                                                      |
| Validation failure               | `400 Bad Request` — `{ "error": "<reason>" }`                                                                                               |
| Rate limiting                    | 3 requests per email per hour; exceeded returns `429 Too Many Requests`                                                                     |

#### Profile Page

| Field                    | Rule                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Endpoint                 | `GET /profile?token=<magic-link-token>`                                                     |
| Valid token              | Validate token without consuming it; render profile page showing current email and nickname |
| Invalid or expired token | Display error page prompting subscriber to request a new Magic Link                         |

#### Update Profile

| Field                       | Rule                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint                    | `POST /api/profile/update`                                                                                                                                   |
| Request body                | `{ "token": "<magic-link-token>", "nickname": "<name>", "email": "<new-address>" }` (both fields optional; omitted fields are left unchanged)                |
| Token consumed              | Token is invalidated immediately after successful processing                                                                                                 |
| Nickname validation         | Must be 1–50 characters; no leading or trailing whitespace                                                                                                   |
| Email unchanged             | If `email` matches current address or is omitted, no email confirmation is triggered                                                                         |
| Email already in use        | `409 Conflict` — `{ "error": "Email already registered" }`; checks all subscriber records (active and pending); no fields are updated; token is NOT consumed |
| Email changed               | Generate email confirmation token and send confirmation email to the new address; nickname update (if provided) still applies immediately                    |
| Confirmation token lifetime | 24 hours from creation                                                                                                                                       |
| Repeat submission           | Since token is consumed on first submission, repeat attempts return `401 Unauthorized`                                                                       |
| Success response            | `200 OK` — `{ "status": "updated" }` (nickname applied immediately; email pending confirmation if changed)                                                   |
| Invalid or expired token    | `401 Unauthorized` — `{ "error": "Invalid or expired token" }`                                                                                               |
| Validation failure          | `400 Bad Request` — `{ "error": "<reason>" }`; token is NOT consumed                                                                                         |

#### Confirm Email

| Field                           | Rule                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Endpoint                        | `GET /confirm?token=<confirm-token>`                                                             |
| Subscription confirmation token | Set `activated_at` to current timestamp; redirect to `/confirmed` welcome page                   |
| Email change confirmation token | Update subscriber email; redirect to `/profile?email_changed=true`                               |
| Expired token                   | Display error page; subscriber must restart the process (resubscribe or redo email change)       |
| Email now taken                 | Display error page; email was registered by another subscriber (active or pending) since request |

---

## Error Scenarios

| Scenario                                                                      | Behavior                                                                                                                |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RSS feed unreachable                                                          | Log error; retry on next scheduled run; do not generate newsletter                                                      |
| RSS feed returns invalid XML                                                  | Log error; skip this run; notify admin after 3 consecutive failures (notification mechanism — _to be decided_)          |
| Email service unavailable                                                     | Queue for retry; log error                                                                                              |
| Email delivery permanently bounces                                            | Store bounce event (retained 7 days); keep subscriber `active`; admin may remove subscriber manually                    |
| Database unavailable                                                          | API returns `503 Service Unavailable`; Cron logs error, retries next run                                                |
| Subscription confirmation token expired or invalid                            | Display error page prompting visitor to resubscribe                                                                     |
| Subscription confirmation for already-active email                            | Return success (idempotent)                                                                                             |
| Concurrent subscribe requests for same email                                  | Idempotent; one record created; both requests return success                                                            |
| Schedule send time in the past                                                | Reject with `400 Bad Request`                                                                                           |
| Newsletter send partially completes                                           | Log aggregate failure count; resume strategy — _to be decided (depends on email service provider selection)_            |
| Admin request without JWT header                                              | `401 Unauthorized` — `{ "error": "Authentication required" }`                                                           |
| Admin request with invalid JWT                                                | `403 Forbidden` — `{ "error": "Invalid token" }`                                                                        |
| Admin request with expired JWT                                                | `403 Forbidden` — `{ "error": "Token expired" }`                                                                        |
| JWKS endpoint unreachable                                                     | `503 Service Unavailable`; log error                                                                                    |
| Auth configuration missing (`CF_ACCESS_TEAM_NAME` or `CF_ACCESS_AUD` not set) | `/admin/*` routes return `500 Internal Server Error` — `{ "error": "Server misconfiguration" }`; log error with details |
| Magic Link token expired or invalid                                           | Display error page prompting subscriber to request a new link                                                           |
| Magic Link token already used                                                 | Display error page prompting subscriber to request a new link                                                           |
| Email confirmation token expired                                              | Do not update email or activate subscription; display error page prompting subscriber to restart process                |
| New email already registered by another subscriber (active or pending)        | Display error page; email was claimed since the change was requested                                                    |
| Nickname exceeds length limit                                                 | `400 Bad Request` — `{ "error": "Nickname must be 1–50 characters" }`                                                   |
| Magic Link request rate exceeded                                              | `429 Too Many Requests`                                                                                                 |

---

## Data Retention & Privacy

### Privacy Principle

The system retains personally identifiable information only for as long as necessary to provide the service, and deletes it immediately once the purpose is fulfilled.

### Data Classification

| Data                            | PII      | Purpose                                   | Retention                                     |
| ------------------------------- | -------- | ----------------------------------------- | --------------------------------------------- |
| Subscriber email                | Yes      | Deliver newsletters                       | While active only; deleted on unsubscribe     |
| Unsubscribe token               | No       | Authenticate unsubscribe                  | Deleted with subscriber record                |
| Rate limit IP                   | Yes      | Enforce subscribe rate limit              | Rate-limit window only (ephemeral)            |
| Newsletter content              | No       | Archive sent newsletters                  | Indefinite (admin content)                    |
| Delivery statistics             | No       | Aggregate analytics                       | Indefinite (no PII)                           |
| Bounce events                   | Yes      | Admin reviews delivery failures           | Ephemeral; auto-purged after 7 days           |
| Subscriber nickname             | Possibly | Newsletter personalization, admin display | While active; deleted with subscriber record  |
| Magic link token                | No       | Authenticate profile access               | Short-lived (15 min); single-use; auto-expire |
| Subscription confirmation token | No       | Verify email ownership for double opt-in  | Short-lived (24 hours); auto-expire           |
| Email change confirmation token | No       | Verify new email ownership                | Short-lived (24 hours); auto-expire           |
| Pending email change            | Yes      | Store new email until confirmed           | Until confirmed or expired                    |
| Unactivated subscriber record   | Yes      | Pending subscription confirmation         | Deleted after confirmation token expires      |
| RSS feed state                  | No       | Track last processed timestamp            | Indefinite (operational)                      |

Admin-related data (JWT claims, identity) is not covered by this privacy policy — the admin is the platform owner.

### Subscriber Data Lifecycle

Unsubscribe and cleanup trigger immediate hard deletion; there is no soft-delete or grace period.

```
[created] ──(confirm)──▶ active ──(unsubscribe)──▶ [deleted]
[created] ──(token expired + cleanup)──▶ [deleted]
active ──(admin remove)──▶ [deleted]
```

| Event                      | Rule                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| Subscription confirmed     | Set `activated_at` to current timestamp; subscriber becomes active |
| Confirmation token expired | Hard delete unactivated subscriber record during cleanup           |
| Unsubscribe                | Validate token, then hard delete subscriber record immediately     |
| Admin removal              | Hard delete immediately                                            |
| Resubscribe after deletion | Creates a new record (previous record is unrecoverable)            |

### Delivery Tracking

| Rule                      | Value                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| Per-recipient tracking    | Not permitted                                                      |
| Per-newsletter statistics | Total sent count, total failure count                              |
| Statistics retention      | Indefinite (contains no PII)                                       |
| Bounce event tracking     | Permitted as exception; ephemeral storage only (see Bounce Events) |

### Bounce Events

Bounce events are an explicit exception to the per-recipient tracking prohibition. They are retained temporarily to allow the administrator to review delivery failures and take corrective action.

| Rule             | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| Stored data      | Subscriber email, bounce reason, timestamp                                      |
| Retention period | 7 days from event creation                                                      |
| Expiry action    | Automatic hard delete                                                           |
| Admin access     | View bounce events; manually remove bounced subscribers during retention period |

### Rate Limit Data

| Rule               | Value                                              |
| ------------------ | -------------------------------------------------- |
| Storage            | Ephemeral only (in-memory or KV with TTL)          |
| Retention          | Evicted after rate-limit window expires (1 minute) |
| Persistent storage | Not permitted                                      |

---

## Technical Decisions

### Storage

| Data                                      | Storage       |
| ----------------------------------------- | ------------- |
| Subscribers                               | Cloudflare D1 |
| Newsletters (content, state, schedule)    | Cloudflare D1 |
| RSS feed state (last processed timestamp) | Cloudflare D1 |

### Email Delivery

To be decided:

- Email service provider
- Options: Resend, SendGrid, Mailgun, Amazon SES
- Selection criteria: Cloudflare Workers compatibility, cost, API simplicity
- Partial send recovery strategy (blocked by provider selection; see Error Scenarios)

### Cron Schedule Defaults

| Job                           | Default Interval |
| ----------------------------- | ---------------- |
| RSS feed check                | Every 1 hour     |
| Scheduled newsletter delivery | Every 5 minutes  |

---

## Terminology

| Term                       | Definition                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subscriber                 | A person identified by email address who has opted in to receive newsletters                                                                             |
| Newsletter                 | An email sent to all active subscribers, either generated from RSS or manually composed                                                                  |
| Feed entry                 | A single item in an RSS feed representing a published piece of content                                                                                   |
| Unsubscribe token          | A unique, per-subscriber token for authenticating unsubscribe requests without login                                                                     |
| Active subscriber          | A subscriber with `activated_at IS NOT NULL` who is eligible to receive newsletters                                                                      |
| `activated_at`             | Nullable timestamp on a subscriber record; `NULL` = pending confirmation, non-`NULL` = active and records when the subscription was confirmed            |
| Double opt-in              | Subscription flow requiring the subscriber to confirm their email address before activation; prevents unauthorized sign-ups                              |
| Confirmation token         | A temporary token (24-hour lifetime) used to verify email ownership; covers both subscription confirmation (double opt-in) and email change confirmation |
| JWKS                       | JSON Web Key Set — public keys published by Cloudflare Access for JWT signature verification                                                             |
| Application Audience (AUD) | Unique identifier for a Cloudflare Access application; used to verify JWT `aud` claim                                                                    |
| Team domain                | Cloudflare Access organization identifier; forms part of the JWKS endpoint URL                                                                           |
| PII                        | Personally Identifiable Information — data that can identify a specific person (e.g., email address)                                                     |
| Hard delete                | Permanent removal of a record from the database; not recoverable                                                                                         |
| Bounce event               | A delivery failure notification indicating an email could not be delivered to a specific subscriber                                                      |
| Magic Link                 | A single-use, time-limited authentication URL sent via email, used for passwordless identity verification                                                |
