import { trpcServer } from "@hono/trpc-server";
import { auth } from "@notify/auth";
import { env } from "@notify/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { sessionMiddleware } from "./middleware/session";
import { webhookAuth } from "./middleware/webhook-auth";
import { webhookHandler } from "./routes/webhook";
import { appRouter } from "./routers/index";
import type { AppEnv } from "./types";
import { createContext } from "./trpc/context";

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("*", logger());
app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

app.use("*", sessionMiddleware);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext(c),
  }),
);

app.post("/webhook", webhookAuth, webhookHandler);

app.get("/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

export { app };
