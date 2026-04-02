import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** One outbound channel: email address or (later) Slack incoming webhook. */
export const notifyDestinations = sqliteTable(
  "notify_destinations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** "email" | "slack" */
    type: text("type").notNull(),
    recipientEmail: text("recipient_email"),
    slackWebhookUrl: text("slack_webhook_url"),
    /** "active" | "paused" */
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("notify_destinations_status_idx").on(table.status)],
);

export type NotifyDestinationRow = typeof notifyDestinations.$inferSelect;
export type NewNotifyDestinationRow = typeof notifyDestinations.$inferInsert;
