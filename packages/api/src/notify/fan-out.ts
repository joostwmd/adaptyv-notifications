import { db } from "@notify/db";
import { destinationTriggers } from "@notify/db/schema/destination-triggers";
import { notifyDeliveries } from "@notify/db/schema/notify-deliveries";
import { notifyDestinations } from "@notify/db/schema/notify-destinations";
import { webhookEvents } from "@notify/db/schema/webhook-events";
import { and, eq } from "drizzle-orm";

import { buildNotificationMessage } from "./build-message";
import { sendEmailNotification } from "./send-email-notification";

export async function fanOutNotifications(webhookEventId: string): Promise<void> {
  const [event] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, webhookEventId))
    .limit(1);

  if (!event) {
    console.error("[fan-out] Webhook event not found:", webhookEventId);
    return;
  }

  let message;
  try {
    message = buildNotificationMessage(event);
  } catch (e) {
    console.error("[fan-out] buildNotificationMessage failed:", e);
    return;
  }

  const destinations = await db
    .select({ d: notifyDestinations })
    .from(notifyDestinations)
    .innerJoin(
      destinationTriggers,
      eq(destinationTriggers.destinationId, notifyDestinations.id),
    )
    .where(
      and(
        eq(notifyDestinations.status, "active"),
        eq(destinationTriggers.experimentStatus, event.newStatus),
        eq(notifyDestinations.type, "email"),
      ),
    );

  for (const { d } of destinations) {
    const email = d.recipientEmail?.trim();
    if (!email) {
      console.warn("[fan-out] Skipping destination without recipient_email:", d.id);
      continue;
    }

    const deliveryId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(notifyDeliveries).values({
      id: deliveryId,
      webhookEventId: event.id,
      destinationId: d.id,
      channel: "email",
      status: "pending",
      error: null,
      createdAt: now,
      completedAt: null,
    });

    try {
      await sendEmailNotification(email, message);
      await db
        .update(notifyDeliveries)
        .set({
          status: "sent",
          completedAt: new Date().toISOString(),
        })
        .where(eq(notifyDeliveries.id, deliveryId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[fan-out] Email failed:", d.id, msg);
      await db
        .update(notifyDeliveries)
        .set({
          status: "failed",
          error: msg.slice(0, 2000),
          completedAt: new Date().toISOString(),
        })
        .where(eq(notifyDeliveries.id, deliveryId));
    }
  }
}
