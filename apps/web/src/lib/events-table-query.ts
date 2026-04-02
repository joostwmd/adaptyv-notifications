import type { Table } from "@tanstack/react-table";

/** Mirrors nuqs keys used by `useDataTable` for the events table. */
export type EventsListInput = {
  page: number;
  pageSize: number;
  sorting: { id: string; desc: boolean }[];
  columnFilters: { id: string; value: unknown }[];
};

const FILTER_IDS = [
  "experimentCode",
  "previousStatus",
  "newStatus",
  "isTest",
  "notifiedSlack",
  "notifiedEmail",
] as const;

export function parseEventsListInputFromSearch(search: string): EventsListInput {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const p = new URLSearchParams(q);
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(p.get("perPage") ?? 10) || 10));
  let sorting: { id: string; desc: boolean }[] = [{ id: "createdAt", desc: true }];
  try {
    const raw = p.get("sort");
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        sorting = parsed as { id: string; desc: boolean }[];
      }
    }
  } catch {
    /* ignore */
  }
  const columnFilters: { id: string; value: unknown }[] = [];
  for (const key of FILTER_IDS) {
    const v = p.get(key);
    if (v == null || v === "") continue;
    columnFilters.push({
      id: key,
      value: v.includes(",") ? v.split(",").filter(Boolean) : v,
    });
  }
  return { page, pageSize, sorting, columnFilters };
}

export function deriveEventsListInputFromTable<TData>(table: Table<TData>): EventsListInput {
  const { pagination, sorting, columnFilters } = table.getState();
  return {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sorting: sorting.map((s) => ({ id: s.id, desc: s.desc })),
    columnFilters: columnFilters.map(({ id, value }) => ({ id, value })),
  };
}

export function eventsListInputEquals(a: EventsListInput, b: EventsListInput): boolean {
  return (
    a.page === b.page &&
    a.pageSize === b.pageSize &&
    JSON.stringify(a.sorting) === JSON.stringify(b.sorting) &&
    JSON.stringify(a.columnFilters) === JSON.stringify(b.columnFilters)
  );
}
