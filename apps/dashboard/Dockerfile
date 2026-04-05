# ── Stage 1: base ─────────────────────────────────────────────────────────────
# Enables corepack so the pnpm version locked in package.json#packageManager is
# used consistently across all stages.
FROM node:22-alpine AS base
RUN corepack enable

# ── Stage 2: deps ─────────────────────────────────────────────────────────────
# Copy manifests only first so Docker can cache the install layer independently
# of source changes.
FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/dashboard/server/package.json    apps/dashboard/server/package.json
COPY apps/dashboard/web/package.json       apps/dashboard/web/package.json
COPY apps/headless/package.json            apps/headless/package.json
COPY packages/api/package.json   packages/api/package.json
COPY packages/auth/package.json  packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json    packages/db/package.json
COPY packages/env/package.json   packages/env/package.json
COPY packages/nodemailer/package.json packages/nodemailer/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json    packages/ui/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 3: builder ──────────────────────────────────────────────────────────
# Full source copy + compile.  tsdown bundles all @notify/* workspace packages
# into a single dist/index.mjs, so the runner only needs external npm deps.
FROM deps AS builder
WORKDIR /app

COPY . .

RUN pnpm --filter server build

# pnpm deploy produces a self-contained directory with only production deps.
# We then overlay the compiled bundle on top.
RUN pnpm --filter server deploy --prod --legacy /prod
RUN cp -r apps/dashboard/server/dist /prod/dist

# ── Stage 4: runner ───────────────────────────────────────────────────────────
# Minimal production image — no dev tooling, no source files.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /prod .

# Render (and most platforms) injects PORT; the server falls back to 3000.
EXPOSE 3000

CMD ["node", "dist/index.mjs"]
