# Gna — Lightweight Campaign Platform

## Purpose

Gna is a self-hosted campaign platform running on Cloudflare Workers that replaces Mailchimp for content creators who publish via RSS feeds. It automatically generates campaigns from RSS feed updates and delivers them via email, providing subscription management through an embeddable CORS API.

## Users

| User                    | Description                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Content Creator (Admin) | Blog or website owner who publishes content via RSS and wants to deliver campaigns to their audience. Acts as the administrator of the platform. |
| Subscriber              | Reader who subscribes to receive email updates from the content creator's site.                                                                  |
| Visitor                 | Anonymous site visitor who may choose to subscribe via the embedded form.                                                                        |

In most deployments, there is a single Content Creator who is also the Administrator.

## Impacts

| Area                    | Before (Mailchimp)                         | After (Gna)                                                    |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Campaign creation       | Manual composition in third-party platform | Automatic generation from RSS feed entries with email delivery |
| Subscription management | Platform-dependent, vendor lock-in         | Self-hosted API, embeddable on any site                        |
| Cost                    | Monthly subscription fee                   | Cloudflare Workers free/paid tier only                         |
| Authentication          | Separate platform credentials              | Cloudflare Zero Trust, no custom auth                          |
| Integration             | Platform-specific widgets                  | CORS-enabled REST API for any origin                           |

## Success Criteria

- A visitor can subscribe via the embedded API, receive a confirmation email, and activate the subscription by clicking the confirmation link (double opt-in).
- New RSS feed entries automatically trigger campaign generation within the configured schedule.
- Campaign email delivery reaches all active subscribers with correct content. Additional delivery channels — _to be decided_ (see §7).
- The admin dashboard is accessible only through Cloudflare Zero Trust authentication.
- The admin can manually compose, schedule, and send campaigns.
- A subscriber can authenticate via Magic Link and update their nickname and email address.

---

## Features

### 1. Subscription API

Embeddable CORS-enabled REST API allowing visitors on any website to subscribe to and unsubscribe from campaign emails.

### 2. Subscriber Management

Admin interface for viewing, searching, and managing the subscriber list.

### 3. RSS Feed Campaign Generation

Automated system that monitors RSS feeds and generates campaigns from new entries, triggered by Cron schedule or webhook push.

### 4. Admin Authentication

Management dashboard protected by Cloudflare Zero Trust Access, requiring no custom authentication implementation.

### 5. Campaign Publishing & Scheduling

Manual campaign composition with immediate send or scheduled delivery.

### 6. Subscriber Profile Management

Subscribers can manage their own profile (nickname and email address) through a passwordless Magic Link authentication flow. After verifying identity via email, subscribers can update their nickname immediately and request an email address change with confirmation.

### 7. Channel Management

Email is the only delivery channel; it is always active and requires no configuration. Channel management (adding and configuring additional delivery channels) — _to be decided_.

---

## User Journeys

### Visitor Subscribes

**Context:** A visitor is reading a blog post and sees a subscription form embedded on the page.

**Action:** The visitor enters their email address and submits the form.

**Outcome:** The form displays a message instructing the visitor to check their inbox for a confirmation email. The system sends a confirmation email to the provided address. When the visitor clicks the confirmation link in the email, the subscription is activated. The visitor is now an active subscriber and will receive future campaign emails.

### Subscriber Unsubscribes

**Context:** A subscriber receives a campaign email containing an unsubscribe link.

**Action:** The subscriber clicks the unsubscribe link.

**Outcome:** The system deletes the subscriber record and displays a confirmation page. The subscriber no longer receives campaign emails.

### RSS Feed Triggers Campaign

**Context:** The content creator publishes a new blog post, which updates the RSS feed.

**Action:** On the next scheduled Cron run (or via incoming webhook), the system detects new RSS entries.

**Outcome:** The system generates a campaign from the new entries and creates an email Delivery. The email is sent to all active subscribers.

### Admin Manages Subscribers

**Context:** The administrator accesses the management dashboard, authenticated via Cloudflare Zero Trust.

**Action:** The admin views the subscriber list, searches for a subscriber, or removes an entry.

**Outcome:** The subscriber list is updated accordingly.

### Admin Publishes Campaign Manually

**Context:** The administrator wants to send a one-off campaign not derived from RSS content.

**Action:** The admin composes a campaign in the dashboard and chooses to send immediately or schedule for later.

**Outcome:** The campaign creates an email Delivery. The email is sent to all active subscribers at the specified time.

### Subscriber Accesses Profile

**Context:** A subscriber wants to update their profile. They follow a profile link in a campaign email or visit the profile page directly.

**Action:** The subscriber enters their email address. The system sends a Magic Link to that address. The subscriber clicks the link in the email.

**Outcome:** The subscriber is authenticated and sees a profile editing page displaying their current email and nickname.

### Subscriber Updates Nickname

**Context:** An authenticated subscriber is on the profile editing page.

**Action:** The subscriber enters a new nickname and saves the change.

**Outcome:** The nickname is updated immediately. Subsequent campaign emails use the new nickname for personalization.

### Subscriber Updates Email

**Context:** An authenticated subscriber is on the profile editing page.

**Action:** The subscriber enters a new email address. The system sends a confirmation email to the new address. The subscriber clicks the confirmation link.

**Outcome:** The subscriber's email is updated to the new address. Subsequent campaign emails are delivered to the new email.

---

## Feature Behaviors

### 1. Subscription API

#### Subscribe

| Field                   | Rule                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint                | `POST /api/subscribe`                                                                                                                  |
| Request body            | `{ "email": "<address>", "nickname": "<name>" }` (`nickname` is optional)                                                              |
| CORS                    | Allow origins configured per deployment                                                                                                |
| Validation              | Reject syntactically invalid email addresses (RFC 5321 addr-spec); if `nickname` provided, must be 1–50 characters                     |
| New subscription        | Create subscriber record with `activated_at = NULL`; generate confirmation token; send confirmation email                              |
| Duplicate (`activated`) | Email already activated (`activated_at IS NOT NULL`) — return success without action (idempotent; does not reveal subscription status) |
| Duplicate (`pending`)   | Email exists but not activated (`activated_at IS NULL`) — regenerate confirmation token and resend confirmation email; return success  |
| Success response        | `201 Created` — `{ "status": "confirmation_sent" }`                                                                                    |
| Validation failure      | `400 Bad Request` — `{ "error": "<reason>" }`                                                                                          |

#### Unsubscribe

| Field           | Rule                                                          |
| --------------- | ------------------------------------------------------------- |
| Endpoint        | `GET /api/unsubscribe?token=<token>`                          |
| Token           | Unique per-subscriber token, included in every campaign email |
| Valid token     | Delete subscriber record; display confirmation page           |
| Invalid token   | Display error page with contact instructions                  |
| Token not found | Display confirmation page (idempotent)                        |

#### Rate Limiting

| Rule                      | Value                   |
| ------------------------- | ----------------------- |
| Subscribe requests per IP | 5 per minute            |
| Exceeded limit            | `429 Too Many Requests` |

### 2. Subscriber Management

#### Subscriber States

```
pending ──(confirm)──▶ activated ──(unsubscribe)──▶ deleted
pending ──(token expired + cleanup)──▶ deleted
activated ──(admin remove)──▶ deleted
```

| State       | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `pending`   | Record exists but `activated_at` is `NULL`; awaiting email confirmation |
| `activated` | `activated_at IS NOT NULL`; receiving campaign emails                   |
| `deleted`   | Record removed from the database                                        |

#### Subscriber Fields

| Field               | Required | Description                                                            |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| `email`             | Yes      | Subscriber's email address                                             |
| `nickname`          | No       | Display name for personalization and admin display                     |
| `unsubscribe_token` | Yes      | Unique token for authenticating unsubscribe                            |
| `activated_at`      | No       | Timestamp of subscription confirmation; `NULL` means not yet activated |

The table above lists core business fields. Additional columns support token storage and profile management (§6): confirmation tokens, magic link authentication, and pending email change. Primary key uses UUIDv7 (TEXT, application-generated); all tokens are embedded in the subscribers table (1:1 relationship); timestamps stored as ISO 8601 TEXT.

Complete column definitions, indexes, and token lifecycle: [docs/schema.md](docs/schema.md)

#### Admin Operations

| Operation        | Rule                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| List subscribers | Paginated list; shows all subscribers (`activated` and `pending`); displays email, nickname, and status label (`Activated` or `Pending`) |
| Search           | Filter by email or nickname (partial match)                                                                                              |
| Remove           | Hard delete from database                                                                                                                |
| Export           | Download subscriber list as CSV                                                                                                          |

#### Pagination

| Field        | Rule                                 |
| ------------ | ------------------------------------ |
| Default size | 20 items per page                    |
| Maximum size | 100 items per page                   |
| Method       | Offset-based (`?page=1&per_page=20`) |
| Sort default | Created date, newest first           |

#### Export Format

| Field    | Rule                                                                        |
| -------- | --------------------------------------------------------------------------- |
| Format   | CSV with header row                                                         |
| Encoding | UTF-8 with BOM                                                              |
| Columns  | `email`, `nickname`, `status` (`Activated` or `Pending`), `activated_at`    |
| Scope    | All subscribers matching current search filter (or all if no filter active) |

### 3. RSS Feed Campaign Generation

#### Feed Monitoring

| Field               | Rule                                                                |
| ------------------- | ------------------------------------------------------------------- |
| Trigger             | Cloudflare Cron Trigger on configured schedule, or incoming webhook |
| Feed URL            | Configured per deployment (single feed)                             |
| New entry detection | Compare entry published timestamps against last processed timestamp |
| New entries found   | Proceed to campaign generation                                      |
| No new entries      | Log the check; take no further action                               |

#### Campaign Generation

| Field             | Rule                                                            |
| ----------------- | --------------------------------------------------------------- |
| Content per entry | Title, summary or excerpt, and link to full article             |
| Batching          | All new entries since last check are combined into one campaign |
| Delivery creation | System creates one email Delivery record                        |
| Empty batch       | No campaign generated                                           |

#### Email Delivery

| Field            | Rule                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Template         | Render entries into email HTML using a configured template                                                                            |
| Personalization  | Template may include subscriber nickname (e.g., "Hi, {nickname}"); fallback to generic greeting (e.g., "Hi") when nickname is not set |
| Recipients       | All subscribers with `activated_at IS NOT NULL`                                                                                       |
| Email headers    | Include `List-Unsubscribe` header with one-click unsubscribe URL (RFC 8058)                                                           |
| Email footer     | Include unsubscribe link and profile management link                                                                                  |
| Failure handling | Log failed deliveries; do not change subscriber state on transient failures                                                           |

Multi-channel delivery for RSS-triggered campaigns — _to be decided_ (see §7 Channel Management).

#### Post-Delivery

| Field          | Rule                                                |
| -------------- | --------------------------------------------------- |
| After delivery | Update last processed timestamp to the latest entry |

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

### 5. Campaign Publishing & Scheduling

#### Manual Composition

| Field           | Rule                                           |
| --------------- | ---------------------------------------------- |
| Required fields | Subject line and body content                  |
| Body format     | HTML with plain-text fallback                  |
| Content editing | Admin edits campaign content before publishing |
| Preview         | Admin can preview before sending               |

Per-channel content editing — _to be decided_ alongside Channel Management (see §7).

#### Campaign States

```
draft ──(schedule)──▶ scheduled ──(send time reached)──▶ publishing ──(all deliveries terminal)──▶ published
  ▲                       │
  └───(cancel schedule)───┘
```

| State        | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `draft`      | Being composed; not yet sent or scheduled                                |
| `scheduled`  | Queued for future delivery at a specific time                            |
| `publishing` | At least one Delivery is `sending`; campaign is actively being delivered |
| `published`  | All Deliveries have reached a terminal state (`sent` or `failed`)        |

#### Campaign Fields

| Field          | Required | Description                                                              |
| -------------- | -------- | ------------------------------------------------------------------------ |
| `subject`      | Yes      | Campaign subject line                                                    |
| `body`         | Yes      | Campaign body content (HTML with plain-text fallback)                    |
| `state`        | Yes      | Current campaign state (`draft`, `scheduled`, `publishing`, `published`) |
| `scheduled_at` | No       | Future send time; required when state is `scheduled`                     |

#### Campaign Admin Operations

| Operation       | Rule                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| List campaigns  | Paginated list; displays subject, state, scheduled time, and delivery summary    |
| Create campaign | Create new campaign in `draft` state with subject and body                       |
| View campaign   | Display campaign detail with all fields and associated Delivery records          |
| Update campaign | Allowed only in `draft` or `scheduled` state; update subject, body, scheduled_at |
| Delete campaign | Allowed only in `draft` state; hard delete campaign and its Delivery records     |

#### Campaign Pagination

| Field        | Rule                                                       |
| ------------ | ---------------------------------------------------------- |
| Default size | 20 items per page                                          |
| Maximum size | 100 items per page                                         |
| Method       | Offset-based (`?page=1&per_page=20`)                       |
| Sort default | Created date, newest first                                 |
| Filter       | By state (`draft`, `scheduled`, `publishing`, `published`) |

#### Delivery States

```
pending ──(campaign starts publishing)──▶ sending ──(complete)──▶ sent
                                             ▲     ──(error)───▶ failed
                                             └──(admin retry)───┘
```

| State     | Description                                    |
| --------- | ---------------------------------------------- |
| `pending` | Delivery created but not yet started           |
| `sending` | Content is being delivered through the channel |
| `sent`    | Delivery completed successfully                |
| `failed`  | Delivery failed; error details logged          |

#### Delivery Fields

| Field           | Required | Description                                             |
| --------------- | -------- | ------------------------------------------------------- |
| `channel_type`  | Yes      | Delivery channel (currently only `email`)               |
| `content`       | No       | Channel-specific content; falls back to campaign body   |
| `state`         | Yes      | Delivery state (`pending`, `sending`, `sent`, `failed`) |
| `sent_count`    | No       | Number of successful sends                              |
| `failure_count` | No       | Number of failed sends                                  |
| `error_detail`  | No       | Error information when state is `failed`                |

#### Retry Operations

| Operation      | Rule                                                   |
| -------------- | ------------------------------------------------------ |
| Retry delivery | Allowed only when Delivery state is `failed`           |
| Retry effect   | `failed` → `sending`; Campaign returns to `publishing` |
| Scope          | Retries a single Delivery, not the entire Campaign     |

#### Campaign–Delivery Transitions

Campaign state is **derived** from its Delivery states:

| Trigger                                 | Campaign transition                  |
| --------------------------------------- | ------------------------------------ |
| Any Delivery moves to `sending`         | Campaign transitions to `publishing` |
| All Deliveries reach `sent` or `failed` | Campaign transitions to `published`  |
| A `failed` Delivery is retried          | Campaign returns to `publishing`     |

#### Schedule Operations

| Operation        | Rule                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| Send immediately | Transition all Deliveries to `sending`; Campaign enters `publishing` |
| Schedule         | Set future send time; transition from `draft` to `scheduled`         |
| Cancel schedule  | Revert from `scheduled` to `draft`                                   |
| Edit scheduled   | Allowed only while in `scheduled` state                              |
| Past send time   | Reject; require a future timestamp                                   |

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

| Field                       | Rule                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint                    | `POST /api/profile/update`                                                                                                                                          |
| Request body                | `{ "token": "<magic-link-token>", "nickname": "<name>", "email": "<new-address>" }` (both fields optional; omitted fields are left unchanged)                       |
| Token consumed              | Token is invalidated immediately after successful processing                                                                                                        |
| Nickname validation         | Must be 1–50 characters; no leading or trailing whitespace                                                                                                          |
| Email unchanged             | If `email` matches current address or is omitted, no email confirmation is triggered                                                                                |
| Email already in use        | `409 Conflict` — `{ "error": "Email already registered" }`; checks all subscriber records (`activated` and `pending`); no fields are updated; token is NOT consumed |
| Email changed               | Generate email confirmation token and send confirmation email to the new address; nickname update (if provided) still applies immediately                           |
| Confirmation token lifetime | 24 hours from creation                                                                                                                                              |
| Repeat submission           | Since token is consumed on first submission, repeat attempts return `401 Unauthorized`                                                                              |
| Success response            | `200 OK` — `{ "status": "updated" }` (nickname applied immediately; email pending confirmation if changed)                                                          |
| Invalid or expired token    | `401 Unauthorized` — `{ "error": "Invalid or expired token" }`                                                                                                      |
| Validation failure          | `400 Bad Request` — `{ "error": "<reason>" }`; token is NOT consumed                                                                                                |

#### Confirm Email

| Field                           | Rule                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Endpoint                        | `GET /confirm?token=<confirm-token>`                                                                    |
| Subscription confirmation token | Set `activated_at` to current timestamp; redirect to `/confirmed` welcome page                          |
| Email change confirmation token | Update subscriber email; redirect to `/profile?email_changed=true`                                      |
| Expired token                   | Display error page; subscriber must restart the process (resubscribe or redo email change)              |
| Email now taken                 | Display error page; email was registered by another subscriber (`activated` or `pending`) since request |

### 7. Channel Management

Email is the only delivery channel; it is always active and requires no configuration. Channel management (adding and configuring additional delivery channels) — _to be decided_.

---

## Error Scenarios

| Scenario                                                                            | Behavior                                                                                                                |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RSS feed unreachable                                                                | Log error; retry on next scheduled run; do not generate campaign                                                        |
| RSS feed returns invalid XML                                                        | Log error; skip this run; notify admin after 3 consecutive failures (notification mechanism — _to be decided_)          |
| Email service unavailable                                                           | Queue for retry; log error                                                                                              |
| Email delivery permanently bounces                                                  | Store bounce event (retained 7 days); keep subscriber `activated`; admin may remove subscriber manually                 |
| Database unavailable                                                                | API returns `503 Service Unavailable`; Cron logs error, retries next run                                                |
| Subscription confirmation token expired or invalid                                  | Display error page prompting visitor to resubscribe                                                                     |
| Subscription confirmation for already-active email                                  | Return success (idempotent)                                                                                             |
| Concurrent subscribe requests for same email                                        | Idempotent; one record created; both requests return success                                                            |
| Schedule send time in the past                                                      | Reject with `400 Bad Request`                                                                                           |
| Delivery failure                                                                    | Delivery transitions to `failed` with error details; admin can retry the Delivery (see Retry Operations)                |
| Campaign operation on invalid state (e.g., edit `published`, schedule `publishing`) | `409 Conflict` — `{ "error": "Operation not allowed in current state" }`                                                |
| Admin request without JWT header                                                    | `401 Unauthorized` — `{ "error": "Authentication required" }`                                                           |
| Admin request with invalid JWT                                                      | `403 Forbidden` — `{ "error": "Invalid token" }`                                                                        |
| Admin request with expired JWT                                                      | `403 Forbidden` — `{ "error": "Token expired" }`                                                                        |
| JWKS endpoint unreachable                                                           | `503 Service Unavailable`; log error                                                                                    |
| Auth configuration missing (`CF_ACCESS_TEAM_NAME` or `CF_ACCESS_AUD` not set`)      | `/admin/*` routes return `500 Internal Server Error` — `{ "error": "Server misconfiguration" }`; log error with details |
| Magic Link token expired or invalid                                                 | Display error page prompting subscriber to request a new link                                                           |
| Magic Link token already used                                                       | Display error page prompting subscriber to request a new link                                                           |
| Email confirmation token expired                                                    | Do not update email or activate subscription; display error page prompting subscriber to restart process                |
| New email already registered by another subscriber (`activated` or `pending`)       | Display error page; email was claimed since the change was requested                                                    |
| Nickname exceeds length limit                                                       | `400 Bad Request` — `{ "error": "Nickname must be 1–50 characters" }`                                                   |
| Magic Link request rate exceeded                                                    | `429 Too Many Requests`                                                                                                 |

---

## Data Retention & Privacy

### Privacy Principle

The system retains personally identifiable information only for as long as necessary to provide the service, and deletes it immediately once the purpose is fulfilled.

### Data Classification

| Data                            | PII      | Purpose                                             | Retention                                     |
| ------------------------------- | -------- | --------------------------------------------------- | --------------------------------------------- |
| Subscriber email                | Yes      | Deliver campaign emails                             | While active only; deleted on unsubscribe     |
| Unsubscribe token               | No       | Authenticate unsubscribe                            | Deleted with subscriber record                |
| Rate limit IP                   | Yes      | Enforce subscribe rate limit                        | Rate-limit window only (ephemeral)            |
| Campaign content                | No       | Archive sent campaigns                              | Indefinite (admin content)                    |
| Delivery records                | No       | Track delivery state                                | Indefinite (admin content)                    |
| Delivery statistics             | No       | Aggregate analytics (per-campaign and per-delivery) | Indefinite (no PII)                           |
| Bounce events                   | Yes      | Admin reviews delivery failures                     | Ephemeral; auto-purged after 7 days           |
| Subscriber nickname             | Possibly | Campaign email personalization, admin display       | While active; deleted with subscriber record  |
| Magic link token                | No       | Authenticate profile access                         | Short-lived (15 min); single-use; auto-expire |
| Subscription confirmation token | No       | Verify email ownership for double opt-in            | Short-lived (24 hours); auto-expire           |
| Email change confirmation token | No       | Verify new email ownership                          | Short-lived (24 hours); auto-expire           |
| Pending email change            | Yes      | Store new email until confirmed                     | Until confirmed or expired                    |
| Unactivated subscriber record   | Yes      | Pending subscription confirmation                   | Deleted after confirmation token expires      |
| RSS feed state                  | No       | Track last processed timestamp                      | Indefinite (operational)                      |

Admin-related data (JWT claims, identity) is not covered by this privacy policy — the admin is the platform owner.

### Subscriber Data Lifecycle

Unsubscribe and cleanup trigger immediate hard deletion; there is no soft-delete or grace period.

```
pending ──(confirm)──▶ activated ──(unsubscribe)──▶ deleted
pending ──(token expired + cleanup)──▶ deleted
activated ──(admin remove)──▶ deleted
```

| Event                      | Rule                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| Subscription confirmed     | Set `activated_at` to current timestamp; subscriber transitions to `activated` |
| Confirmation token expired | Hard delete unactivated subscriber record during cleanup                       |
| Unsubscribe                | Validate token, then hard delete subscriber record immediately                 |
| Admin removal              | Hard delete immediately                                                        |
| Resubscribe after deletion | Creates a new record (previous record is unrecoverable)                        |

### Delivery Tracking

| Rule                    | Value                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| Per-recipient tracking  | Not permitted                                                        |
| Per-campaign statistics | Total sent count, total failure count (aggregated across deliveries) |
| Per-delivery statistics | Sent count, failure count                                            |
| Statistics retention    | Indefinite (contains no PII)                                         |
| Bounce event tracking   | Permitted as exception; ephemeral storage only (see Bounce Events)   |

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
| Campaigns (content, state, schedule)      | Cloudflare D1 |
| Deliveries (content, state, stats)        | Cloudflare D1 |
| RSS feed state (last processed timestamp) | Cloudflare D1 |

### Email Delivery

To be decided:

- Email service provider
- Options: Resend, SendGrid, Mailgun, Amazon SES
- Selection criteria: Cloudflare Workers compatibility, cost, API simplicity
- Partial send recovery strategy (admin can retry failed Deliveries; see Retry Operations)

### Cron Schedule Defaults

| Job                         | Default Interval |
| --------------------------- | ---------------- |
| RSS feed check              | Every 1 hour     |
| Scheduled campaign delivery | Every 5 minutes  |

---

## Terminology

| Term                       | Definition                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign                   | A content delivery action, either generated from RSS or manually composed, delivered via email                                                                                                  |
| Delivery                   | A record within a campaign tracking the content, state, and statistics for a delivery channel (currently email only)                                                                            |
| Channel                    | A delivery target for campaigns; currently only email is supported (see §7 for future extensibility)                                                                                            |
| Subscriber                 | A person identified by email address who has opted in to receive campaign emails                                                                                                                |
| Feed entry                 | A single item in an RSS feed representing a published piece of content                                                                                                                          |
| Unsubscribe token          | A unique, per-subscriber token for authenticating unsubscribe requests without login                                                                                                            |
| Active subscriber          | A subscriber in the `activated` state (`activated_at IS NOT NULL`) who is eligible to receive campaign emails                                                                                   |
| `activated_at`             | Nullable timestamp on a subscriber record; `NULL` = `pending`, non-`NULL` = `activated`; records when the subscription was confirmed                                                            |
| Double opt-in              | Subscription flow requiring the subscriber to confirm their email address before activation; prevents unauthorized sign-ups                                                                     |
| Confirmation token         | A temporary token (24-hour lifetime) used to verify email ownership; covers both subscription confirmation (double opt-in) and email change confirmation                                        |
| JWKS                       | JSON Web Key Set — public keys published by Cloudflare Access for JWT signature verification                                                                                                    |
| Application Audience (AUD) | Unique identifier for a Cloudflare Access application; used to verify JWT `aud` claim                                                                                                           |
| Team domain                | Cloudflare Access organization identifier; forms part of the JWKS endpoint URL                                                                                                                  |
| PII                        | Personally Identifiable Information — data that can identify a specific person (e.g., email address)                                                                                            |
| Hard delete                | Permanent removal of a record from the database; not recoverable                                                                                                                                |
| Bounce event               | A delivery failure notification indicating an email could not be delivered to a specific subscriber                                                                                             |
| Transient failure          | A temporary delivery error (e.g., network timeout, rate limit, service temporarily unavailable) that may succeed on retry; contrast with permanent failure (e.g., invalid address, hard bounce) |
| Magic Link                 | A single-use, time-limited authentication URL sent via email, used for passwordless identity verification                                                                                       |
