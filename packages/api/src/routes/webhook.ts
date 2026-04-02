import type { Context } from "hono";

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

  // Stub: persist + fan-out in a later phase
  return c.json({ ok: true }, 200);
}
