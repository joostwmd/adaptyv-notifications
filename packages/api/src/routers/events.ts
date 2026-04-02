import { db } from "@notify/db";
import { notifyDeliveries } from "@notify/db/schema/notify-deliveries";
import { webhookEvents } from "@notify/db/schema/webhook-events";
import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const columnFilterSchema = z.object({
  id: z.string(),
  value: z.unknown(),
});

export const eventsListInputSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  sorting: z.array(
    z.object({
      id: z.string(),
      desc: z.boolean(),
    }),
  ),
  columnFilters: z.array(columnFilterSchema),
});

const sortColumnMap = {
  createdAt: webhookEvents.createdAt,
  experimentId: webhookEvents.experimentId,
  experimentCode: webhookEvents.experimentCode,
  previousStatus: webhookEvents.previousStatus,
  newStatus: webhookEvents.newStatus,
} as const;

function normalizeFilterValues(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(String).filter((v) => v.length > 0);
  if (typeof value === "boolean") return [String(value)];
  const s = String(value);
  return s.length > 0 ? [s] : [];
}

export const eventsRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.id, input.id))
        .limit(1);
      return row ?? null;
    }),

  list: protectedProcedure.input(eventsListInputSchema).query(async ({ input }) => {
    const conditions: SQL[] = [eq(webhookEvents.isTest, false)];

    for (const filter of input.columnFilters) {
      const strValues = normalizeFilterValues(filter.value);
      if (strValues.length === 0) continue;

      switch (filter.id) {
        case "experimentCode": {
          const term = strValues[0]?.replace(/[%_\\]/g, "") ?? "";
          if (!term) break;
          const pattern = `%${term}%`;
          conditions.push(
            or(
              like(webhookEvents.experimentId, pattern),
              like(webhookEvents.experimentCode, pattern),
            )!,
          );
          break;
        }
        case "previousStatus":
          conditions.push(inArray(webhookEvents.previousStatus, strValues));
          break;
        case "newStatus":
          conditions.push(inArray(webhookEvents.newStatus, strValues));
          break;
        default:
          break;
      }
    }

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ count: count() })
      .from(webhookEvents)
      .where(whereClause);

    const total = countRow?.count ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / input.pageSize));

    const orderByClauses: SQL[] = [];
    if (input.sorting.length === 0) {
      orderByClauses.push(desc(webhookEvents.createdAt));
    } else {
      for (const sort of input.sorting) {
        const col = sortColumnMap[sort.id as keyof typeof sortColumnMap];
        if (col) {
          orderByClauses.push(sort.desc ? desc(col) : asc(col));
        }
      }
    }
    if (orderByClauses.length === 0) {
      orderByClauses.push(desc(webhookEvents.createdAt));
    }

    const rows = await db
      .select()
      .from(webhookEvents)
      .where(whereClause)
      .orderBy(...orderByClauses)
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    const ids = rows.map((r) => r.id);
    const statsMap = new Map<
      string,
      { sent: number; failed: number; pending: number }
    >();

    if (ids.length > 0) {
      const agg = await db
        .select({
          webhookEventId: notifyDeliveries.webhookEventId,
          sent: sql<number>`coalesce(sum(case when ${notifyDeliveries.status} = 'sent' then 1 else 0 end), 0)`,
          failed: sql<number>`coalesce(sum(case when ${notifyDeliveries.status} = 'failed' then 1 else 0 end), 0)`,
          pending: sql<number>`coalesce(sum(case when ${notifyDeliveries.status} = 'pending' then 1 else 0 end), 0)`,
        })
        .from(notifyDeliveries)
        .where(inArray(notifyDeliveries.webhookEventId, ids))
        .groupBy(notifyDeliveries.webhookEventId);

      for (const a of agg) {
        statsMap.set(a.webhookEventId, {
          sent: Number(a.sent),
          failed: Number(a.failed),
          pending: Number(a.pending),
        });
      }
    }

    return {
      data: rows.map((r) => ({
        id: r.id,
        experimentId: r.experimentId,
        experimentCode: r.experimentCode,
        previousStatus: r.previousStatus,
        newStatus: r.newStatus,
        rawPayload: r.rawPayload,
        createdAt: r.createdAt,
        deliveries: statsMap.get(r.id) ?? { sent: 0, failed: 0, pending: 0 },
      })),
      pageCount,
      total,
    };
  }),
});
