import { env } from "@notify/env/headless";
import { createMailer } from "@notify/nodemailer/mailer";
import { createWebhookAuth } from "@notify/shared/webhook-auth";
import { webhookPayloadSchema } from "@notify/shared/webhook-schema";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { fanOutHeadless, runHeadlessTest } from "./notify";

const mailer = createMailer({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
  from: env.SMTP_FROM,
});

const webhookAuth = createWebhookAuth(env.WEBHOOK_TOKEN);

const app = new Hono();

app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok", mode: "headless" }));

app.post("/webhook", webhookAuth, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      400,
    );
  }

  const subscribed = env.SUBSCRIBE_STATUSES.includes(parsed.data.new_status);
  if (!subscribed) {
    return c.json({ ok: true, skipped: true, reason: "status_not_subscribed" });
  }

  const notified = await fanOutHeadless(mailer.sendMail, parsed.data);
  return c.json({ ok: true, notified });
});

app.get("/test", webhookAuth, async (c) => {
  const report = await runHeadlessTest(mailer.sendMail);
  return c.json({ ok: true, report });
});

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

export { app };
