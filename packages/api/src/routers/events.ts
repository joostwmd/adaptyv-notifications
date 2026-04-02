import { db } from "@notify/db";
import { events } from "@notify/db/schema/events";
import { and, asc, count, desc, eq, inArray, like, or, type SQL } from "drizzle-orm";
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
  createdAt: events.createdAt,
  experimentId: events.experimentId,
  experimentCode: events.experimentCode,
  previousStatus: events.previousStatus,
  newStatus: events.newStatus,
  notifiedSlack: events.notifiedSlack,
  notifiedEmail: events.notifiedEmail,
  isTest: events.isTest,
} as const;

function normalizeFilterValues(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(String).filter((v) => v.length > 0);
  if (typeof value === "boolean") return [String(value)];
  const s = String(value);
  return s.length > 0 ? [s] : [];
}

export const eventsRouter = router({
  list: protectedProcedure.input(eventsListInputSchema).query(async ({ input }) => {
    const conditions: SQL[] = [];

    for (const filter of input.columnFilters) {
      const strValues = normalizeFilterValues(filter.value);
      if (strValues.length === 0) continue;

      switch (filter.id) {
        case "experimentCode": {
          const term = strValues[0]?.replace(/[%_\\]/g, "") ?? "";
          if (!term) break;
          const pattern = `%${term}%`;
          conditions.push(
            or(like(events.experimentId, pattern), like(events.experimentCode, pattern))!,
          );
          break;
        }
        case "previousStatus":
          conditions.push(inArray(events.previousStatus, strValues));
          break;
        case "newStatus":
          conditions.push(inArray(events.newStatus, strValues));
          break;
        case "isTest": {
          const v = strValues[0] === "true";
          conditions.push(eq(events.isTest, v));
          break;
        }
        case "notifiedSlack": {
          const n = Number(strValues[0]);
          if (!Number.isNaN(n)) conditions.push(eq(events.notifiedSlack, n));
          break;
        }
        case "notifiedEmail": {
          const n = Number(strValues[0]);
          if (!Number.isNaN(n)) conditions.push(eq(events.notifiedEmail, n));
          break;
        }
        default:
          break;
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db.select({ count: count() }).from(events).where(whereClause);

    const total = countRow?.count ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / input.pageSize));

    const orderByClauses: SQL[] = [];
    if (input.sorting.length === 0) {
      orderByClauses.push(desc(events.createdAt));
    } else {
      for (const sort of input.sorting) {
        const col = sortColumnMap[sort.id as keyof typeof sortColumnMap];
        if (col) {
          orderByClauses.push(sort.desc ? desc(col) : asc(col));
        }
      }
    }
    if (orderByClauses.length === 0) {
      orderByClauses.push(desc(events.createdAt));
    }

    const rows = await db
      .select()
      .from(events)
      .where(whereClause)
      .orderBy(...orderByClauses)
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    return {
      data: rows.map((r) => ({
        id: r.id,
        experimentId: r.experimentId,
        experimentCode: r.experimentCode,
        previousStatus: r.previousStatus,
        newStatus: r.newStatus,
        rawPayload: r.rawPayload,
        isTest: r.isTest,
        notifiedSlack: r.notifiedSlack,
        notifiedEmail: r.notifiedEmail,
        notificationError: r.notificationError,
        createdAt: r.createdAt,
      })),
      pageCount,
      total,
    };
  }),
});
