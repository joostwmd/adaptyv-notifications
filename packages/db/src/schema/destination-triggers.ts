import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { notifyDestinations } from "./notify-destinations";

/** Which experiment statuses cause a destination to receive a notification. */
export const destinationTriggers = sqliteTable(
  "destination_triggers",
  {
    destinationId: text("destination_id")
      .notNull()
      .references(() => notifyDestinations.id, { onDelete: "cascade" }),
    experimentStatus: text("experiment_status").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.destinationId, table.experimentStatus] }),
  ],
);

export type DestinationTriggerRow = typeof destinationTriggers.$inferSelect;
export type NewDestinationTriggerRow = typeof destinationTriggers.$inferInsert;
