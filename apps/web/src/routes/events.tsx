import type { ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarIcon,
  FlaskConical,
  Mail,
  MessageSquare,
  Text,
  type LucideIcon,
} from "lucide-react";
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
import { Badge } from "@notify/ui/components/badge";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type EventListItem = RouterOutputs["events"]["list"]["data"][number];

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "Draft", value: "draft" },
  { label: "Waiting for confirmation", value: "waiting_for_confirmation" },
  { label: "Quote sent", value: "quote_sent" },
  { label: "Waiting for materials", value: "waiting_for_materials" },
  { label: "In queue", value: "in_queue" },
  { label: "In production", value: "in_production" },
  { label: "Data analysis", value: "data_analysis" },
  { label: "In review", value: "in_review" },
  { label: "Done", value: "done" },
  { label: "Canceled", value: "canceled" },
];

const NOTIFY_OPTIONS = [
  { label: "Pending", value: "0" },
  { label: "Sent", value: "1" },
  { label: "Failed", value: "-1" },
];

function notifyIconState(v: number): "ok" | "fail" | "pending" {
  if (v === 1) return "ok";
  if (v === -1) return "fail";
  return "pending";
}

function NotifyCell({ value, Icon }: { value: number; Icon: LucideIcon }) {
  const state = notifyIconState(value);
  const className =
    state === "ok"
      ? "text-emerald-600"
      : state === "fail"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={String(value)}>
      <Icon className="size-4" />
      {state === "ok" ? "✓" : state === "fail" ? "✗" : "—"}
    </span>
  );
}

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

function RouteComponent() {
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
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("previousStatus")}</span>
        ),
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
        cell: ({ row }) => <span>{row.getValue("newStatus")}</span>,
        meta: {
          label: "To status",
          variant: "select",
          options: STATUS_OPTIONS,
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "notifiedSlack",
        accessorKey: "notifiedSlack",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Slack" />
        ),
        cell: ({ row }) => (
          <NotifyCell value={row.getValue("notifiedSlack")} Icon={MessageSquare} />
        ),
        meta: {
          label: "Slack",
          variant: "select",
          options: NOTIFY_OPTIONS,
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "notifiedEmail",
        accessorKey: "notifiedEmail",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Email" />
        ),
        cell: ({ row }) => (
          <NotifyCell value={row.getValue("notifiedEmail")} Icon={Mail} />
        ),
        meta: {
          label: "Email",
          variant: "select",
          options: NOTIFY_OPTIONS,
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "isTest",
        accessorKey: "isTest",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Test" />,
        cell: ({ row }) =>
          row.getValue("isTest") ? (
            <Badge variant="secondary" className="gap-1">
              <FlaskConical className="size-3" />
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
    </div>
  );
}
