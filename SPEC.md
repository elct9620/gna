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

- A visitor can subscribe and unsubscribe without errors via the embedded API.
- New RSS feed entries automatically trigger newsletter generation within the configured schedule.
- Newsletters are delivered to all active subscribers with correct content.
- The admin dashboard is accessible only through Cloudflare Zero Trust authentication.
- The admin can manually compose, schedule, and send newsletters.

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

---

## User Journeys

### Visitor Subscribes

**Context:** A visitor is reading a blog post and sees a subscription form embedded on the page.

**Action:** The visitor enters their email address and submits the form.

**Outcome:** The system records the subscription. The visitor sees a confirmation message.

### Subscriber Unsubscribes

**Context:** A subscriber receives a newsletter email containing an unsubscribe link.

**Action:** The subscriber clicks the unsubscribe link.

**Outcome:** The system marks the subscriber as unsubscribed and displays a confirmation page. The subscriber no longer receives newsletters.

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

---

## Feature Behaviors

### 1. Subscription API

#### Subscribe

| Field              | Rule                                                         |
| ------------------ | ------------------------------------------------------------ |
| Endpoint           | `POST /api/subscribe`                                        |
| Request body       | `{ "email": "<address>" }`                                   |
| CORS               | Allow origins configured per deployment                      |
| Validation         | Reject malformed email addresses                             |
| Duplicate email    | Return success without creating a second record (idempotent) |
| Success response   | `201 Created` — `{ "status": "subscribed" }`                 |
| Validation failure | `400 Bad Request` — `{ "error": "<reason>" }`                |

#### Unsubscribe

| Field                | Rule                                                            |
| -------------------- | --------------------------------------------------------------- |
| Endpoint             | `GET /api/unsubscribe?token=<token>`                            |
| Token                | Unique per-subscriber token, included in every newsletter email |
| Valid token          | Mark subscriber as `unsubscribed`; display confirmation page    |
| Invalid token        | Display error page with contact instructions                    |
| Already unsubscribed | Display confirmation page (idempotent)                          |

#### Rate Limiting

| Rule                      | Value                   |
| ------------------------- | ----------------------- |
| Subscribe requests per IP | 5 per minute            |
| Exceeded limit            | `429 Too Many Requests` |

### 2. Subscriber Management

#### Subscriber States

```
active ──(unsubscribe)──▶ unsubscribed
```

| State          | Description                             |
| -------------- | --------------------------------------- |
| `active`       | Receiving newsletters                   |
| `unsubscribed` | Opted out; excluded from all deliveries |

#### Admin Operations

| Operation        | Behavior                                                         |
| ---------------- | ---------------------------------------------------------------- |
| List subscribers | Paginated list; filterable by state; default shows `active` only |
| Search           | Filter by email (partial match)                                  |
| Remove           | Hard delete from database                                        |
| Export           | Download subscriber list as CSV                                  |

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

| Field             | Rule                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Content per entry | Title, summary or excerpt, and link to full article               |
| Batching          | All new entries since last check are combined into one newsletter |
| Template          | Render entries into email HTML using a configured template        |
| Empty batch       | No newsletter generated                                           |

#### Delivery

| Field            | Rule                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| Recipients       | All subscribers in `active` state                                           |
| Email headers    | Include `List-Unsubscribe` header with one-click unsubscribe URL (RFC 8058) |
| Failure handling | Log failed deliveries; do not change subscriber state on transient failures |
| After delivery   | Update last processed timestamp to the latest entry                         |

### 4. Admin Authentication

| Field                   | Rule                                                          |
| ----------------------- | ------------------------------------------------------------- |
| Method                  | Cloudflare Zero Trust Access                                  |
| Protected routes        | All routes under `/admin/*`                                   |
| Unauthenticated request | Redirected to Cloudflare Access login page                    |
| Authorization           | Any user permitted by the configured Cloudflare Access policy |

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

---

## Error Scenarios

| Scenario                                     | Behavior                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| RSS feed unreachable                         | Log error; retry on next scheduled run; do not generate newsletter       |
| RSS feed returns invalid XML                 | Log error; skip this run; alert admin after 3 consecutive failures       |
| Email service unavailable                    | Queue for retry; log error                                               |
| Email delivery permanently bounces           | Log bounce; keep subscriber `active` (admin handles manually)            |
| Database unavailable                         | API returns `503 Service Unavailable`; Cron logs error, retries next run |
| Concurrent subscribe requests for same email | Idempotent; one record created; both requests return success             |
| Schedule send time in the past               | Reject with `400 Bad Request`                                            |
| Newsletter send partially completes          | Track per-recipient status; resume remaining on next Cron tick           |

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

### Cron Schedule Defaults

| Job                           | Default Interval |
| ----------------------------- | ---------------- |
| RSS feed check                | Every 1 hour     |
| Scheduled newsletter delivery | Every 5 minutes  |

---

## Terminology

| Term              | Definition                                                                              |
| ----------------- | --------------------------------------------------------------------------------------- |
| Subscriber        | A person identified by email address who has opted in to receive newsletters            |
| Newsletter        | An email sent to all active subscribers, either generated from RSS or manually composed |
| Feed entry        | A single item in an RSS feed representing a published piece of content                  |
| Unsubscribe token | A unique, per-subscriber token for authenticating unsubscribe requests without login    |
| Active subscriber | A subscriber in the `active` state who is eligible to receive newsletters               |
