import type { Context } from "hono";

import { db } from "@notify/db";
import { events } from "@notify/db/schema/events";

import { webhookPayloadSchema } from "../lib/webhook-schema";

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

  await db.insert(events).values({
    id: crypto.randomUUID(),
    experimentId: data.experiment_id,
    experimentCode,
    previousStatus: data.previous_status,
    newStatus: data.new_status,
    rawPayload: JSON.stringify(body),
    isTest: false,
    notifiedSlack: 0,
    notifiedEmail: 0,
    notificationError: null,
    createdAt: new Date().toISOString(),
  });

  return c.json({ ok: true }, 200);
}
