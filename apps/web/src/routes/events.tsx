import { StatusBadge } from "@/components/status-badge";
import type { ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { CalendarIcon, FlaskConical, Text } from "lucide-react";
import * as React from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useDataTable } from "@/hooks/use-data-table";
import {
  deriveEventsListInputFromTable,
  eventsListInputEquals,
  parseEventsListInputFromSearch,
  type EventsListInput,
} from "@/lib/events-table-query";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import type { AppRouter } from "@notify/api/routers/index";
import {
  EXPERIMENT_STATUSES,
  statusMeta,
  type ExperimentStatus,
} from "@notify/api/lib/status-meta";
import { Badge } from "@notify/ui/components/badge";
import { Button } from "@notify/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@notify/ui/components/dialog";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type EventListItem = RouterOutputs["events"]["list"]["data"][number];

const STATUS_OPTIONS = EXPERIMENT_STATUSES.map((value) => ({
  value,
  label: statusMeta[value].label,
}));

export const Route = createFileRoute("/events")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
    return { session };
  },
});

function deliveriesSummary(d: EventListItem["deliveries"]): string {
  const parts: string[] = [];
  if (d.sent) parts.push(`${d.sent} sent`);
  if (d.failed) parts.push(`${d.failed} failed`);
  if (d.pending) parts.push(`${d.pending} pending`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function RouteComponent() {
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const detailEvent = useQuery({
    ...trpc.events.getById.queryOptions({ id: detailId! }),
    enabled: detailId != null,
  });

  const detailDeliveries = useQuery({
    ...trpc.deliveries.listByEvent.queryOptions({ webhookEventId: detailId! }),
    enabled: detailId != null,
  });

  const columns = React.useMemo<ColumnDef<EventListItem>[]>(
    () => [
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Received" />
        ),
        cell: ({ row }) => {
          const iso = row.getValue<string>("createdAt");
          const d = new Date(iso);
          return (
            <span className="whitespace-nowrap tabular-nums" title={iso}>
              {formatDistanceToNow(d, { addSuffix: true })}
            </span>
          );
        },
        meta: {
          label: "Received",
          variant: "date",
          icon: CalendarIcon,
        },
        enableSorting: true,
      },
      {
        id: "experimentCode",
        accessorFn: (row) => row.experimentCode ?? row.experimentId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Experiment" />
        ),
        cell: ({ row }) => {
          const code = row.original.experimentCode;
          const id = row.original.experimentId;
          return <span className="font-mono text-sm">{code ?? id}</span>;
        },
        meta: {
          label: "Experiment",
          placeholder: "Search code or id…",
          variant: "text",
          icon: Text,
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "previousStatus",
        accessorKey: "previousStatus",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="From" />
        ),
        cell: ({ row }) => {
          const s = row.getValue("previousStatus") as string;
          if ((EXPERIMENT_STATUSES as readonly string[]).includes(s)) {
            return <StatusBadge status={s as ExperimentStatus} />;
          }
          return <span className="text-muted-foreground">{s}</span>;
        },
        meta: {
          label: "From status",
          variant: "select",
          options: STATUS_OPTIONS,
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "newStatus",
        accessorKey: "newStatus",
        header: ({ column }) => <DataTableColumnHeader column={column} label="To" />,
        cell: ({ row }) => {
          const s = row.getValue("newStatus") as string;
          if ((EXPERIMENT_STATUSES as readonly string[]).includes(s)) {
            return <StatusBadge status={s as ExperimentStatus} />;
          }
          return <span>{s}</span>;
        },
        meta: {
          label: "To status",
          variant: "select",
          options: STATUS_OPTIONS,
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "deliveries",
        accessorFn: (row) => deliveriesSummary(row.deliveries),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Deliveries" />
        ),
        cell: ({ row }) => {
          const d = row.original.deliveries;
          const summary = deliveriesSummary(d);
          const hasIssue = d.failed > 0;
          return (
            <span
              className={
                hasIssue ? "text-destructive text-sm" : "text-muted-foreground text-sm"
              }
            >
              {summary}
            </span>
          );
        },
        meta: { label: "Deliveries" },
        enableSorting: false,
      },
      {
        id: "isTest",
        accessorKey: "isTest",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Test" />,
        cell: ({ row }) =>
          row.getValue("isTest") ? (
            <Badge variant="secondary" render={<span />}>
              <FlaskConical className="size-3" data-icon="inline-start" />
              Test
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: {
          label: "Test event",
          variant: "boolean",
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => setDetailId(row.original.id)}>
            Details
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const [listInput, setListInput] = React.useState<EventsListInput>(() =>
    typeof window !== "undefined"
      ? parseEventsListInputFromSearch(window.location.search)
      : {
          page: 1,
          pageSize: 10,
          sorting: [{ id: "createdAt", desc: true }],
          columnFilters: [],
        },
  );

  const listQuery = useQuery({
    ...trpc.events.list.queryOptions(listInput),
    placeholderData: keepPreviousData,
  });

  const { table } = useDataTable({
    columns,
    data: listQuery.data?.data ?? [],
    pageCount: listQuery.data?.pageCount ?? 1,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      pagination: { pageIndex: 0, pageSize: listInput.pageSize },
    },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const sortingKey = JSON.stringify(table.getState().sorting);
  const filtersKey = JSON.stringify(table.getState().columnFilters);

  React.useLayoutEffect(() => {
    const next = deriveEventsListInputFromTable(table);
    setListInput((prev) => (eventsListInputEquals(prev, next) ? prev : next));
  }, [pageIndex, pageSize, sortingKey, filtersKey, table]);

  const detailPayload = detailEvent.data?.rawPayload;

  const formattedPayload = React.useMemo(() => {
    if (detailPayload == null) return detailEvent.isFetching ? "…" : "Not found";
    try {
      return JSON.stringify(JSON.parse(detailPayload), null, 2);
    } catch {
      return detailPayload;
    }
  }, [detailPayload, detailEvent.isFetching]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhook events</h1>
        <p className="text-muted-foreground text-sm">
          Incoming experiment status transitions ({listQuery.data?.total ?? "…"} total).
        </p>
      </div>
      <DataTable table={table}>
        <DataTableToolbar table={table}>
          <DataTableSortList table={table} />
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
      </DataTable>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event details</DialogTitle>
            <DialogDescription>Raw payload and per-destination delivery attempts.</DialogDescription>
          </DialogHeader>
          {detailId ? (
            <div className="grid gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-1 font-medium">Raw payload</p>
                <pre className="bg-muted max-h-48 overflow-auto rounded border p-2 font-mono whitespace-pre-wrap">
                  {formattedPayload}
                </pre>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 font-medium">Deliveries</p>
                {detailDeliveries.isLoading ? (
                  <p>Loading…</p>
                ) : detailDeliveries.data?.length === 0 ? (
                  <p className="text-muted-foreground">No delivery rows (no matching destinations).</p>
                ) : (
                  <ul className="space-y-2">
                    {detailDeliveries.data?.map((d) => (
                      <li
                        key={d.id}
                        className="bg-muted/50 flex flex-col gap-0.5 rounded border px-2 py-1.5"
                      >
                        <span className="font-medium">{d.destinationName}</span>
                        <span className="text-muted-foreground">
                          {d.channel} · {d.status}
                          {d.error ? ` · ${d.error}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
