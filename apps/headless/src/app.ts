import { env } from "@notify/env/headless";
import type { SendMailInput } from "@notify/nodemailer/mailer";
import { createWebhookAuth } from "@notify/shared/webhook-auth";
import { webhookPayloadSchema } from "@notify/shared/webhook-schema";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { useEmail } from "use-email";

import { fanOutHeadless, runHeadlessTest } from "./notify";
import { applyUseEmailEnvBridge } from "./use-email-env-bridge";

function createHeadlessSendMail(): (input: SendMailInput) => Promise<unknown> {
  if (env.EMAIL_RECIPIENTS.length === 0) {
    return async () => {
      throw new Error("sendMail called but EMAIL_RECIPIENTS is empty");
    };
  }

  applyUseEmailEnvBridge(env.EMAIL_PROVIDER!, env.EMAIL_PROVIDER_KEY!);
  const service = useEmail(env.EMAIL_PROVIDER!);

  return (input) =>
    service.send({
      from: env.EMAIL_FROM!,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text !== undefined ? { text: input.text } : {}),
    });
}

const sendMail = createHeadlessSendMail();

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

  const notified = await fanOutHeadless(sendMail, parsed.data);
  return c.json({ ok: true, notified });
});

app.get("/test", webhookAuth, async (c) => {
  const started = Date.now();
  console.info("[headless:test] GET /test (after auth)", {
    emailRecipients: env.EMAIL_RECIPIENTS.length,
    slackWebhooks: env.SLACK_WEBHOOK_URLS.length,
    emailProvider: env.EMAIL_RECIPIENTS.length > 0 ? env.EMAIL_PROVIDER : "(email disabled)",
  });
  try {
    const report = await runHeadlessTest(sendMail);
    console.info("[headless:test] GET /test response", {
      ms: Date.now() - started,
      emailAttempts: report.email.results.length,
      slackAttempts: report.slack.results.length,
    });
    return c.json({ ok: true, report });
  } catch (err) {
    console.error("[headless:test] GET /test threw", {
      ms: Date.now() - started,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
});

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

export { app };
