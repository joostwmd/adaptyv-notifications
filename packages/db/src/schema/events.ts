import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Webhook events (Adaptyv Foundry experiment status transitions). */
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    experimentId: text("experiment_id").notNull(),
    experimentCode: text("experiment_code"),
    previousStatus: text("previous_status").notNull(),
    newStatus: text("new_status").notNull(),
    rawPayload: text("raw_payload").notNull(),
    isTest: integer("is_test", { mode: "boolean" }).default(false).notNull(),
    /** 0 = not sent, 1 = sent, -1 = failed */
    notifiedSlack: integer("notified_slack").default(0).notNull(),
    /** 0 = not sent, 1 = sent, -1 = failed */
    notifiedEmail: integer("notified_email").default(0).notNull(),
    notificationError: text("notification_error"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("events_experiment_id_idx").on(table.experimentId),
    index("events_created_at_idx").on(table.createdAt),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
