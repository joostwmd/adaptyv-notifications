import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { notifyDestinations } from "./notify-destinations";
import { webhookEvents } from "./webhook-events";

/** One delivery attempt for a webhook event to a destination. */
export const notifyDeliveries = sqliteTable(
  "notify_deliveries",
  {
    id: text("id").primaryKey(),
    webhookEventId: text("webhook_event_id")
      .notNull()
      .references(() => webhookEvents.id),
    destinationId: text("destination_id")
      .notNull()
      .references(() => notifyDestinations.id, { onDelete: "restrict" }),
    /** "email" | "slack" */
    channel: text("channel").notNull(),
    /** "pending" | "sent" | "failed" */
    status: text("status").notNull().default("pending"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("notify_deliveries_webhook_event_id_idx").on(table.webhookEventId),
    index("notify_deliveries_destination_id_idx").on(table.destinationId),
  ],
);

export type NotifyDeliveryRow = typeof notifyDeliveries.$inferSelect;
export type NewNotifyDeliveryRow = typeof notifyDeliveries.$inferInsert;
