# Adaptyv Notifications

A small **webhook consumer and notification hub** for [Adaptyv Foundry](https://foundry.adaptyvbio.com): point Foundry’s experiment webhooks at your own deployment, and get **email alerts** when experiments move through statuses you care about. A dashboard lets you manage destinations, per-status triggers, inbound webhook history, and delivery results—so you spend less time polling the UI and more time on the science.

The app ships as a **Render-ready pair**: a Node API (Hono + tRPC) and a static React SPA, wired together by the included [Blueprint](render.yml).

> **Not affiliated with or endorsed by Adaptyv Bio.** This is an independent project to make Foundry-style webhook workflows easier for teams who want alerts without building and hosting their own glue service.

---

## Motivation

Foundry can send **experiment lifecycle webhooks**, but every team that wants **internal notifications** still has to run something: validate payloads, store events, fan out to email or chat, and give operators a place to configure it. That is repetitive work and easy to get wrong in production (auth, CORS, SMTP, durable storage).

This project is an **out-of-the-box** answer: one-click deploy, paste your webhook URL into Foundry, configure who gets mail and on which status transitions. No custom server required.

Inbound JSON is validated against an **assumed** schema aligned with Foundry-style payloads (see [`packages/api/src/lib/webhook-schema.ts`](packages/api/src/lib/webhook-schema.ts)); if Foundry’s shape changes, update the schema and redeploy.

---

## Deploy your own instance

The recommended path is a one-click **Render** deployment using the included [Blueprint](render.yml).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/joostwmd/adaptyv-notifications)

Render provisions **`notify-api`** (Docker web service) and **`notify-web`** (static site). `BETTER_AUTH_SECRET`, `WEBHOOK_TOKEN`, `BETTER_AUTH_URL`, and `VITE_SERVER_URL` are wired automatically where possible; complete these **after the first deploy**:

1. **`DATABASE_URL`** (on `notify-api`) — use a remote LibSQL / [Turso](https://turso.tech) URL. A `file:` URL is not durable across redeploys.
2. **`CORS_ORIGIN`** (on `notify-api`) — exact browser origin of your deployed SPA (e.g. `https://notify-web.onrender.com`), no trailing slash.
3. **SMTP** (on `notify-api`) — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for your provider (Resend, Postmark, etc.).
4. **Migrate** — in the Render Shell for `notify-api`, run `pnpm db:migrate`.

`GET /health` on the API returns `{ "status": "ok" }` — use it to confirm the service is up.

### Foundry webhook URL

Configure Foundry to POST to:

```http
POST https://<your-notify-api-host>/webhook?token=<WEBHOOK_TOKEN>
Content-Type: application/json
```

Use the same secret as `WEBHOOK_TOKEN` (timing-safe comparison). The dashboard shows the exact URL once you are signed in.

### Environment variables

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

Server variables are validated in [`packages/env/src/server.ts`](packages/env/src/server.ts). Use [`.env.example`](.env.example) as the template for `apps/server/.env`.

---

## Roadmap

- [ ] **Production database guide (Turso)** — document and wire up Turso as the recommended production database; add `DATABASE_AUTH_TOKEN` support to the env validator and `createClient`, and write a step-by-step migration path from the ephemeral SQLite used during initial deployment.
- [ ] **Slack (and other channels)** — destinations can include non-email types in the data model; fan-out today only sends **email**. Slack-style webhooks are the next logical step.
- [ ] **Background jobs and retries** — delivery runs in-process after the webhook responds; a queue-backed worker would improve resilience under load.
- [ ] **Stronger webhook contract** — optional documentation or fixtures from Adaptyv would reduce guesswork; until then, monitor for payload drift and adjust the Zod schema as needed.

---

## Also built: Adaptyv Foundry MCP

If you want **AI assistants** (Claude, Cursor, etc.) to query and manage Foundry experiments via **MCP tools**, see the companion project:

**[joostwmd/adaptyv-mcp](https://github.com/joostwmd/adaptyv-mcp)** — Model Context Protocol server for the Foundry API (stdio + Streamable HTTP `/mcp`), with mock mode for local development.

---

## Repository structure

| Path | Description |
| --- | --- |
| [`apps/web`](apps/web) | React SPA (Vite, TanStack Router, tRPC client). |
| [`apps/server`](apps/server) | Node entry: Hono + tRPC + webhook route. |
| [`packages/api`](packages/api) | HTTP app, routers, webhook handler, notification fan-out. |
| [`packages/auth`](packages/auth) | Better Auth (email OTP). |
| [`packages/db`](packages/db) | Drizzle schema and migrations (LibSQL). |
| [`packages/env`](packages/env) | Validated environment for server and Vite. |
| [`packages/nodemailer`](packages/nodemailer) | Transactional HTML email via SMTP. |
| [`packages/ui`](packages/ui) | Shared UI (shadcn-style components). |
| [`scripts/emit-webhook.ts`](scripts/emit-webhook.ts) | Local synthetic webhook posts for testing. |

Bootstrapped from [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack); behavior and deployment notes above are specific to this product.

---

## Local development

```bash
pnpm install
```

**Server** — copy [`.env.example`](.env.example) to `apps/server/.env` and fill in values.

**Web** — create `apps/web/.env` with `VITE_SERVER_URL=http://localhost:3000` (no path suffix).

```bash
pnpm run db:push
pnpm run dev
```

- App: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000](http://localhost:3000)

Test webhooks locally (requires `WEBHOOK_TOKEN` in `apps/server/.env`):

```bash
pnpm webhook:test
pnpm webhook:test -- --count 5
pnpm webhook:test -- --lifecycle
```

Optional: override the target URL with `WEBHOOK_TEST_URL`.

### Production-style builds

**API:** `pnpm --filter server build` then `node apps/server/dist/index.mjs` (respects `PORT`, default `3000`).

**Web:** `VITE_SERVER_URL=https://your-api.example.com pnpm --filter web build` — serve `apps/web/dist` from any static host.

In production, serve **both** the API and the SPA over **HTTPS** (Render does this by default). Better Auth uses `sameSite: "none"` and `secure: true` for cookies in production.
