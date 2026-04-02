import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Inbound Adaptyv Foundry webhook payloads (experiment status transitions). */
export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    experimentId: text("experiment_id").notNull(),
    experimentCode: text("experiment_code"),
    previousStatus: text("previous_status").notNull(),
    newStatus: text("new_status").notNull(),
    rawPayload: text("raw_payload").notNull(),
    isTest: integer("is_test", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("webhook_events_experiment_id_idx").on(table.experimentId),
    index("webhook_events_created_at_idx").on(table.createdAt),
  ],
);

export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type NewWebhookEventRow = typeof webhookEvents.$inferInsert;
