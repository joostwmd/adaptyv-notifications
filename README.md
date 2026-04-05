# Adaptyv Notifications

A small **webhook consumer and notification hub** for [Adaptyv Foundry](https://foundry.adaptyvbio.com): point Foundry’s experiment webhooks at your deployment and get **email** (and optionally **Slack**) when experiments change status.

> **Dashboard status:** The full **dashboard** experience (React SPA + database-backed API with per-destination rules, event history, and delivery tracking) is **not working reliably yet** and should be treated as **experimental**. For a deployment you can use today, prefer the **headless** variant below.

> **Not affiliated with or endorsed by Adaptyv Bio.** This is an independent project to make Foundry-style webhook workflows easier for teams who want alerts without building their own glue service.

---

## Headless variant (recommended)

The **headless** service is a single Node process configured entirely with **environment variables**. It exposes `POST /webhook` (same Foundry contract as the full app), optional `GET /test?token=…` to verify email/Slack, and `GET /health`.

### Benefits

- **No Turso / LibSQL database** — nothing to provision or migrate; no `DATABASE_URL`.
- **Simple ops** — one Docker image, one web service on Render, env vars only.
- **Email + Slack** — comma-separated recipients and Slack incoming webhook URLs in env.

### Limitations

- **Global subscription only** — `SUBSCRIBE_STATUSES` applies to the whole deployment. You cannot configure different status sets per email address or Slack channel (unlike the dashboard’s per-destination triggers).
- **No persistence** — incoming webhooks are **not stored**; there is **no event log** and **no delivery log**.
- **Limited observability** — with no record of deliveries, **error tracing and debugging** are harder (check provider logs, SMTP bounces, and Slack webhook responses only).
- **SMTP on Render’s free web tier is blocked** — Free instances **cannot open outbound connections to SMTP ports** `25`, `465`, and `587` ([Render changelog](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)). The headless blueprint defaults to **`plan: free`** in [`render-headless.yaml`](render-headless.yaml), so **Nodemailer/SMTP will time out** there. **Use HTTPS-based sending instead** — see [Email on Render free (recommended path)](#email-on-render-free-recommended-path) below.

### Email on Render free (recommended path)

**All outbound traffic stays on HTTPS (port 443)** if you send mail through a provider’s **HTTP API**, same class of egress as calling Slack webhooks — so it works on **Render free** where SMTP is blocked.

The practical approach is **[SupersaasHQ/useEmail](https://github.com/SupersaasHQ/useEmail)** ([npm: `use-email`](https://www.npmjs.com/package/use-email)): one small `send()`-style API over **Resend**, SendGrid, Postmark, Mailgun, Plunk, Zeptomail, etc., each talking to the provider over **HTTPS** (set e.g. `RESEND_API_TOKEN` per their README).

Headless in this repo still uses **Nodemailer + SMTP** today; **wiring headless to `use-email` (e.g. `useEmail("resend")`) is the way to go** for email on the free plan without upgrading Render. Alternatively, **any paid Render instance type** restores outbound SMTP if you prefer to keep the current stack.

Configuration is validated in [`packages/env/src/headless.ts`](packages/env/src/headless.ts). Local template: [`apps/headless/.env.example`](apps/headless/.env.example). [`render-headless.yaml`](render-headless.yaml) lists the same variables with `sync: false` so Render asks for them when you deploy the blueprint.

### Deploy headless to Render (one click)

[![Deploy headless to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/joostwmd/adaptyv-notifications)

**Important:** After you connect the repo, Render defaults to the root **`render.yaml`** (dashboard stack). For headless, set **Blueprint path** to **`render-headless.yaml`** on the Blueprint setup screen ([docs: custom blueprint path](https://render.com/docs/infrastructure-as-code#setup)). You will be prompted for each variable in that file (same set as [`apps/headless/.env.example`](apps/headless/.env.example)). Optional `EMAIL_RECIPIENTS` / `SLACK_WEBHOOK_URLS` can be left empty in the dashboard if you only use the other channel.

### Foundry webhook URL (headless)

```http
POST https://<your-notify-headless-host>/webhook?token=<WEBHOOK_TOKEN>
Content-Type: application/json
```

Verify setup:

```http
GET https://<your-notify-headless-host>/test?token=<WEBHOOK_TOKEN>
```

### If `/test` spins or returns 502 (e.g. on Render)

Check **Render → service → Logs**. The server prints **`[headless:test]`** lines for each step (SMTP host/port, per-recipient `sendMail`, Slack webhook host, durations). A **502** often means the edge proxy gave up while **SMTP was still connecting** (wrong host/port/TLS, provider blocking datacenter IPs) or the handler ran too long. On **Render free**, SMTP timeouts are often **firewall-related** — see the **SMTP on Render’s free web tier** bullet under [Limitations](#limitations) above. Outbound **Slack** requests abort after **15s**; **SMTP** uses Nodemailer defaults of about **15s connection** and **25s socket** (see [`packages/nodemailer/src/mailer.ts`](packages/nodemailer/src/mailer.ts)) so the route should finish or fail within that window instead of hanging indefinitely.

---

## Dashboard variant (experimental)

The intended experience is a **Render-ready pair**: a Node API (Hono + tRPC) and a static React SPA, defined in [`render.yaml`](render.yaml). The API image is built from [`apps/dashboard/Dockerfile`](apps/dashboard/Dockerfile) (build context: repo root). Root [`.dockerignore`](.dockerignore) is a symlink to [`apps/dashboard/.dockerignore`](apps/dashboard/.dockerignore).

[![Deploy dashboard to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/joostwmd/adaptyv-notifications)

This button uses the default **`render.yaml`** at the repo root. After the first deploy you still need a remote **LibSQL / [Turso](https://turso.tech)** URL, **`CORS_ORIGIN`** matching the static site, **SMTP**, and a **`pnpm db:migrate`** (or equivalent) on the API service. **Expect rough edges** until the dashboard stack is stabilized.

`GET /health` on the API returns `{ "status": "ok" }` when the process is up.

### Foundry webhook URL (dashboard API)

```http
POST https://<your-notify-api-host>/webhook?token=<WEBHOOK_TOKEN>
Content-Type: application/json
```

When the dashboard works, it can show the exact URL after sign-in.

### Dashboard environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Always | LibSQL URL (local file for dev; Turso / remote for production). |
| `BETTER_AUTH_SECRET` | Always | At least 32 characters. |
| `BETTER_AUTH_URL` | Always | Public base URL of the API (where `/api/auth` and `/trpc` are served). |
| `CORS_ORIGIN` | Always | Exact origin of the SPA (scheme + host, no path). |
| `WEBHOOK_TOKEN` | Always | Secret query param for `POST /webhook`. |
| `SMTP_HOST` | Always | SMTP hostname. |
| `SMTP_PORT` | Always | SMTP port (e.g. `465`). |
| `SMTP_USER` | Always | SMTP username. |
| `SMTP_PASS` | Always | SMTP password or API key. |
| `SMTP_FROM` | Always | From address (verified with your provider). |
| `ALLOWED_EMAIL_DOMAINS` | No | Comma-separated list; if set, sign-in is restricted to those domains. |
| `NODE_ENV` | No | `development` \| `production` \| `test` (defaults to `development`). |
| `VITE_SERVER_URL` | Web build | API public origin (no `/trpc` suffix); set on the static site build. |

Validated in [`packages/env/src/server.ts`](packages/env/src/server.ts). Template: [`.env.example`](.env.example) → `apps/dashboard/server/.env`.

---

## Motivation

Foundry can send **experiment lifecycle webhooks**, but teams that want **internal notifications** still need something to validate payloads, fan out to email or chat, and (optionally) configure rules. This repo provides a **headless** path without a database, and an eventual **dashboard** path with richer configuration—once that stack is stable.

Inbound JSON is validated against an assumed Foundry-style schema ([`packages/shared/src/webhook-schema.ts`](packages/shared/src/webhook-schema.ts)); if Foundry’s shape changes, update the schema and redeploy.

---

## Roadmap

- [ ] **Headless email on free Render** — integrate HTTPS sending (recommended: [`use-email`](https://github.com/SupersaasHQ/useEmail) + e.g. Resend); see [Email on Render free (recommended path)](#email-on-render-free-recommended-path). Until then, SMTP-only headless needs a **paid** Render instance ([Limitations](#limitations)).
- [ ] **Stabilize the dashboard** — SPA + API + auth + DB path reliable for production.
- [ ] **Production database guide (Turso)** — document Turso, optional `DATABASE_AUTH_TOKEN`, and migrations.
- [ ] **Slack in dashboard** — data model allows Slack destinations; dashboard fan-out is email-only today; headless already supports Slack via env.
- [ ] **Background jobs and retries** — queue-backed delivery for both variants.
- [ ] **Stronger webhook contract** — fixtures or docs from Adaptyv would reduce payload drift risk.

---

## Also built: Adaptyv Foundry MCP

If you want **AI assistants** (Claude, Cursor, etc.) to query and manage Foundry experiments via **MCP tools**, see **[joostwmd/adaptyv-mcp](https://github.com/joostwmd/adaptyv-mcp)**.

---

## Repository structure

| Path | Description |
| --- | --- |
| [`apps/dashboard/web`](apps/dashboard/web) | React SPA (Vite, TanStack Router, tRPC client). |
| [`apps/dashboard/server`](apps/dashboard/server) | Node entry: Hono + tRPC + webhook route. |
| [`apps/dashboard/Dockerfile`](apps/dashboard/Dockerfile) | Production image for the dashboard API. |
| [`apps/dashboard/.dockerignore`](apps/dashboard/.dockerignore) | Docker ignore rules; root [`.dockerignore`](.dockerignore) symlinks here (context root). |
| [`apps/headless`](apps/headless) | Env-only webhook server (email + Slack, no DB). |
| [`render.yaml`](render.yaml) | Render blueprint for dashboard API + static web. |
| [`render-headless.yaml`](render-headless.yaml) | Render blueprint for headless service only. |
| [`packages/api`](packages/api) | HTTP app, routers, webhook handler, notification fan-out. |
| [`packages/auth`](packages/auth) | Better Auth (email OTP). |
| [`packages/db`](packages/db) | Drizzle schema and migrations (LibSQL). |
| [`packages/env`](packages/env) | Validated environment for server, headless, and Vite. |
| [`packages/nodemailer`](packages/nodemailer) | Transactional HTML email via SMTP. |
| [`packages/shared`](packages/shared) | Shared webhook schema, statuses, auth middleware factory. |
| [`packages/ui`](packages/ui) | Shared UI (shadcn-style components). |
| [`scripts/emit-webhook.ts`](scripts/emit-webhook.ts) | Local synthetic webhook posts for testing. |

Bootstrapped from [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

---

## Local development

```bash
pnpm install
```

### Headless

Copy env vars into `apps/headless/.env` (see [`packages/env/src/headless.ts`](packages/env/src/headless.ts)), then:

```bash
pnpm dev:headless
```

Default port `3000` unless `PORT` is set. Use `GET /test?token=…` to exercise email/Slack.

### Dashboard (experimental)

**Server** — [`.env.example`](.env.example) → `apps/dashboard/server/.env`.

**Web** — `apps/dashboard/web/.env` with `VITE_SERVER_URL=http://localhost:3000`.

```bash
pnpm run db:push
pnpm run dev
```

- App: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:3000](http://localhost:3000)

Test webhooks against the dashboard API (requires `WEBHOOK_TOKEN` in `apps/dashboard/server/.env`):

```bash
pnpm webhook:test
```

Optional: `WEBHOOK_TEST_URL` (e.g. point at headless).

### Production-style builds

**Dashboard API:** `pnpm --filter server build` then `node apps/dashboard/server/dist/index.mjs`.

**Web:** `VITE_SERVER_URL=https://your-api.example.com pnpm --filter web build` — output in `apps/dashboard/web/dist`.

**Headless:** `pnpm --filter headless build` then `node apps/headless/dist/index.mjs`.

In production, use **HTTPS** (Render does by default). Better Auth uses `sameSite: "none"` and `secure: true` for cookies in production when `NODE_ENV=production`.
