# Adaptyv Notifications

**Headless Foundry Notify** — a small **webhook consumer** for [Adaptyv Foundry](https://foundry.adaptyvbio.com). Point Foundry’s experiment webhooks at your deployment; when an experiment’s status changes, the service can send **email** (HTTPS via [use-email](https://www.npmjs.com/package/use-email)), **Slack** (incoming webhooks), or both. Everything is configured with **environment variables**; there is **no database**.

> **Not affiliated with or endorsed by Adaptyv Bio.** Independent tooling for teams who want alerts without building their own glue service.

---

## What this project is

The **primary product** in this repository is the **headless** service in [`apps/headless`](apps/headless): one Node process, one HTTP server, env-only configuration.

| You get | Details |
| --- | --- |
| **Endpoints** | `POST /webhook` (Foundry-style JSON + `?token=`), `GET /test?token=…` (smoke test email + Slack), `GET /health` |
| **Channels** | Optional comma-separated **emails** and optional comma-separated **Slack incoming webhook URLs** |
| **Subscription** | Global filter: only `new_status` values listed in `SUBSCRIBE_STATUSES` trigger notifications |
| **Ops** | Single Docker image; [Render blueprint](render-headless.yaml) for a one-service deploy |

**Tradeoffs:** no per-recipient rules (unlike a future dashboard), no stored event or delivery history, debugging relies on logs and your email/Slack provider.

---

## Configuration (environment variables)

Headless reads **process environment** variables — locally from **`apps/headless/.env`** (see [Local development](#local-development-headless)), on a host from its **dashboard / secrets UI** (see [Deployment](#deployment)). Names and rules are validated in [`packages/env/src/headless.ts`](packages/env/src/headless.ts); copy from [`apps/headless/.env.example`](apps/headless/.env.example).

| Variable | Required | Description |
| --- | --- | --- |
| `WEBHOOK_TOKEN` | **Yes** | Shared secret. Foundry (or any client) must pass it as the **`token` query parameter** on `/webhook` and `/test`. Use a long random string. |
| `SUBSCRIBE_STATUSES` | **Yes** | Comma-separated Foundry statuses. A webhook is **only** processed when its **`new_status`** appears in this list (otherwise the server responds with `skipped: true` and sends nothing). Valid values: `draft`, `waiting_for_confirmation`, `quote_sent`, `waiting_for_materials`, `in_queue`, `in_production`, `data_analysis`, `in_review`, `done`, `canceled`. |
| `EMAIL_RECIPIENTS` | No | Comma-separated recipient addresses. If **empty**, email is disabled and **`EMAIL_*` provider variables are not required** (Slack-only is valid). |
| `SLACK_WEBHOOK_URLS` | No | Comma-separated **Slack Incoming Webhook** URLs (see [Slack: incoming webhooks](#slack-incoming-webhooks)). If empty, Slack is disabled. |
| `EMAIL_PROVIDER` | When email is used | One of: `resend`, `plunk`, `sendgrid`, `postmark`, `zeptomail` ([use-email](https://github.com/SupersaasHQ/useEmail) providers over HTTPS). |
| `EMAIL_FROM` | When email is used | From address verified with your provider. |
| `EMAIL_PROVIDER_KEY` | When email is used | API key for the chosen provider (the app maps this to the env name `use-email` expects). |
| `NODE_ENV` | No | `development`, `production`, or `test` (default `development`). |

### Slack: incoming webhooks

Headless uses Slack’s **Incoming Webhooks** feature: each URL is a long `https://hooks.slack.com/services/...` secret that posts messages into **one Slack channel** (the channel you picked when creating the webhook).

#### URL strategy

| Approach | When to use it |
| --- | --- |
| **One webhook URL** | One channel (e.g. `#foundry-alerts`) gets every experiment notification. Simplest setup. |
| **Several URLs in `SLACK_WEBHOOK_URLS`** | Comma-separated list, **no spaces** unless they are inside a single URL (avoid commas inside URLs). Each URL delivers to its own channel — useful if different channels should see the same events (e.g. `#lab` + `#ops`). |
| **Separate deployments** | Different Foundry projects or environments → different services each with their own `SLACK_WEBHOOK_URLS` and/or `WEBHOOK_TOKEN`. |

Treat each webhook URL like a **password**: anyone with the URL can post to that channel. Rotate it in Slack if it leaks; update the env var on your host and restart or redeploy.

#### Creating webhook URLs in Slack

1. Open [api.slack.com/apps](https://api.slack.com/apps) and sign in.
2. **Create New App** → **From scratch** → choose a name and **workspace**.
3. In the app, enable **Incoming Webhooks** and turn the toggle **On**.
4. **Add New Webhook to Workspace** → pick the **channel** → authorize.
5. Copy the **Webhook URL** into `SLACK_WEBHOOK_URLS` in `apps/headless/.env` (one URL, or several comma-separated).

Optional: create **multiple** webhooks (same app or different apps) if you need multiple channels.

---

## Local development (headless)

First-time **setup** to run the service on your machine:

```bash
pnpm install
cp apps/headless/.env.example apps/headless/.env
# Edit apps/headless/.env — see [Configuration](#configuration-environment-variables) and [Slack](#slack-incoming-webhooks)
pnpm dev:headless
```

- API default: [http://localhost:3000](http://localhost:3000) unless `PORT` is set.

**Smoke test** (email + Slack, if configured):

```http
GET http://localhost:3000/test?token=<WEBHOOK_TOKEN>
```

You should get JSON with per-recipient results and see a short test message in Slack.

### Synthetic webhook script

From the repo root:

```bash
pnpm webhook:test
```

Loads **`scripts/.env`** (create it with at least `WEBHOOK_TOKEN` matching headless). Optional: `WEBHOOK_TEST_URL` (defaults to `http://localhost:3000`).

**Important:** Random payloads use random `new_status` values. Only statuses in **`SUBSCRIBE_STATUSES`** trigger fan-out. For predictable tests:

```bash
pnpm webhook:test -- --from in_production --to done
```

(only works if `done` is in `SUBSCRIBE_STATUSES`).

---

## Deployment

Headless is one **Docker** image ([`apps/headless/Dockerfile`](apps/headless/Dockerfile)); production is “run the container (or Node bundle) with the same env vars as in [Configuration](#configuration-environment-variables).”

### Render (recommended)

[![Deploy headless to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/joostwmd/adaptyv-notifications)

1. Use the button above and connect this repo.
2. Set **Blueprint path** to **`render-headless.yaml`** (Render otherwise defaults to root **`render.yaml`**, which is the experimental dashboard stack — [custom blueprint path](https://render.com/docs/infrastructure-as-code#setup)).
3. Enter each variable in the Render UI when prompted (same keys as [`apps/headless/.env.example`](apps/headless/.env.example) and [`render-headless.yaml`](render-headless.yaml)).

**Render free tier:** outbound **SMTP** ports are blocked on free web services ([Render changelog](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)). Headless uses **HTTPS email APIs** (`use-email`) only, so email works on **`plan: free`** in `render-headless.yaml`.

### Foundry webhook URL (production)

After deploy, point Foundry at your public host (replace host and token):

```http
POST https://<your-host>/webhook?token=<WEBHOOK_TOKEN>
Content-Type: application/json
```

Payload shape is validated against [`packages/shared/src/webhook-schema.ts`](packages/shared/src/webhook-schema.ts). If Foundry’s JSON changes, update the schema and redeploy.

### Production-style build (any host)

```bash
pnpm --filter headless build
node apps/headless/dist/index.mjs
```

Use **HTTPS** in front of the service in production (Render terminates TLS for you). Set `PORT` if the platform injects it.

---

## If `/test` or `/webhook` is slow or returns 502

Check service logs. Headless logs **`[headless:test]`** during `GET /test`. Slack `fetch` uses a **15s** timeout. Email uses your provider’s HTTP API; failures usually show in the JSON `errors` array on successful HTTP responses, or in logs.

---

## Roadmap

- [x] Headless email over HTTPS (`use-email`) for Render free compatibility.
- [ ] Stabilize optional dashboard stack (see below).
- [ ] Slack + richer rules in dashboard fan-out.
- [ ] Background jobs / retries for delivery.
- [ ] Stronger webhook contract (fixtures or upstream docs).

---

## Also built: Adaptyv Foundry MCP

For **AI assistants** (Claude, Cursor, etc.) querying Foundry via **MCP**, see **[joostwmd/adaptyv-mcp](https://github.com/joostwmd/adaptyv-mcp)**.

---

## Repository structure

| Path | Description |
| --- | --- |
| [`apps/headless`](apps/headless) | **Main product:** env-only webhook server (email + Slack, no DB). |
| [`render-headless.yaml`](render-headless.yaml) | Render blueprint for headless only. |
| [`packages/shared`](packages/shared) | Webhook schema, statuses, webhook auth helper. |
| [`packages/env`](packages/env) | Validated env (headless + dashboard). |
| [`scripts/emit-webhook.ts`](scripts/emit-webhook.ts) | Local synthetic `POST /webhook` for testing. |
| [`apps/dashboard/*`](apps/dashboard) | **Experimental** SPA + API (see next section). |
| [`render.yaml`](render.yaml) | Blueprint for dashboard API + static site (not the default path for headless deploys). |
| [`packages/api`](packages/api), [`packages/db`](packages/db), [`packages/auth`](packages/auth) | Dashboard-only stack pieces. |

Bootstrapped from [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

---

## Dashboard variant (experimental, not the main product)

There is also a **dashboard** direction in this repo: a React SPA plus a **Hono + tRPC** API with **Better Auth**, **per-destination rules**, and persistence in a **third-party LibSQL database** (e.g. [Turso](https://turso.tech)). It is **not stable yet** — more moving parts (database migrations, CORS, auth secrets, SMTP for the dashboard path today), and not recommended for production the way headless is.

If you want to explore it: code under [`apps/dashboard`](apps/dashboard), API and fan-out in [`packages/api`](packages/api), schema in [`packages/db`](packages/db). Deploy artifacts are described in [`render.yaml`](render.yaml) (no deploy button here by design). Environment details: [`packages/env/src/server.ts`](packages/env/src/server.ts) and [`.env.example`](.env.example) / `apps/dashboard/server/.env`.

When you need **one global subscription**, **no DB**, and **Slack + HTTPS email**, use **headless** above.
