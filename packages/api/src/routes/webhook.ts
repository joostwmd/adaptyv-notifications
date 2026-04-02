import type { Context } from "hono";

import { db } from "@notify/db";
import { webhookEvents } from "@notify/db/schema/webhook-events";

import { webhookPayloadSchema } from "../lib/webhook-schema";
import { fanOutNotifications } from "../notify/fan-out";

export async function webhookHandler(c: Context) {
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

  const data = parsed.data;
  const experimentCode =
    data.experiment_code ?? data.experiment?.code ?? null;

  const eventId = crypto.randomUUID();

  await db.insert(webhookEvents).values({
    id: eventId,
    experimentId: data.experiment_id,
    experimentCode,
    previousStatus: data.previous_status,
    newStatus: data.new_status,
    rawPayload: JSON.stringify(body),
    isTest: false,
    createdAt: new Date().toISOString(),
  });

  void fanOutNotifications(eventId).catch((err) => {
    console.error("[webhook] fan-out error:", err);
  });

  return c.json({ ok: true }, 200);
}
