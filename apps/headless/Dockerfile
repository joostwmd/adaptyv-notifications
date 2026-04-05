FROM node:22-alpine AS base
RUN corepack enable

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

FROM deps AS builder
WORKDIR /app

COPY . .

RUN pnpm --filter headless build

RUN pnpm --filter headless deploy --prod --legacy /prod
RUN cp -r apps/headless/dist /prod/dist

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /prod .

EXPOSE 3000

CMD ["node", "dist/index.mjs"]
