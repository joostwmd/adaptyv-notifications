import { StatusBadge } from "@/components/status-badge";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  Code2,
  Copy,
  Inbox,
  Mail,
  MessageSquare,
  Text,
  XCircle,
} from "lucide-react";
import * as React from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
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
  type ExperimentStatus,
} from "@notify/api/lib/status-meta";
import { Badge } from "@notify/ui/components/badge";
import { Button } from "@notify/ui/components/button";
import { Skeleton } from "@notify/ui/components/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notify/ui/components/sheet";
import { cn } from "@notify/ui/lib/utils";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type EventListItem = RouterOutputs["events"]["list"]["data"][number];
type DeliveryRow = RouterOutputs["deliveries"]["listByEvent"][number];

export const Route = createFileRoute("/events")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/",
        throw: true,
      });
    }
    return { session };
  },
});

/** One sort control: click header to cycle unsorted → asc → desc (no second Sort menu). */
function SortableHeader<TData>({
  column,
  label,
  title: titleAttr,
}: {
  column: Column<TData, unknown>;
  label: string;
  title?: string;
}) {
  if (!column.getCanSort()) {
    return (
      <span className="text-muted-foreground text-xs font-medium tabular-nums">{label}</span>
    );
  }
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      title={titleAttr}
      className={cn(
        "-ml-1 inline-flex min-h-11 max-w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs font-medium sm:min-h-8 sm:px-1.5 sm:py-0",
        "text-foreground hover:bg-muted/50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
      )}
      onClick={column.getToggleSortingHandler()}
    >
      <span className="truncate">{label}</span>
      {sorted === "desc" ? (
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      ) : sorted === "asc" ? (
        <ChevronUp className="size-3.5 shrink-0 opacity-70" aria-hidden />
      ) : (
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-35" aria-hidden />
      )}
    </button>
  );
}

function deliveryCountsAria(d: EventListItem["deliveries"]): string {
  const { sent, failed, pending } = d;
  const parts: string[] = [];
  if (sent) parts.push(`${sent} sent`);
  if (failed) parts.push(`${failed} failed`);
  if (pending) parts.push(`${pending} pending`);
  return parts.length > 0 ? parts.join(", ") : "No delivery attempts";
}

function DeliveryCountBadges({ d }: { d: EventListItem["deliveries"] }) {
  const total = d.sent + d.failed + d.pending;
  if (total === 0) {
    return <span className="text-muted-foreground text-sm tabular-nums">—</span>;
  }
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="group"
      aria-label={deliveryCountsAria(d)}
    >
      {d.sent > 0 ? (
        <Badge
          variant="secondary"
          className="h-5 gap-0.5 px-1.5 py-0 text-[11px] font-medium tabular-nums"
        >
          <Check className="size-3 opacity-80" aria-hidden />
          {d.sent}
        </Badge>
      ) : null}
      {d.failed > 0 ? (
        <Badge
          variant="destructive"
          className="h-5 gap-0.5 px-1.5 py-0 text-[11px] font-medium tabular-nums"
        >
          <XCircle className="size-3 opacity-90" aria-hidden />
          {d.failed}
        </Badge>
      ) : null}
      {d.pending > 0 ? (
        <Badge
          variant="outline"
          className="text-muted-foreground h-5 gap-0.5 border-border/80 px-1.5 py-0 text-[11px] font-medium tabular-nums"
        >
          <Clock className="size-3 opacity-70" aria-hidden />
          {d.pending}
        </Badge>
      ) : null}
    </div>
  );
}

function ChannelGlyph({ channel }: { channel: string }) {
  const c = channel.toLowerCase();
  if (c === "email") {
    return <Mail className="size-3.5 shrink-0 opacity-80" aria-hidden />;
  }
  if (c === "slack") {
    return <MessageSquare className="size-3.5 shrink-0 opacity-80" aria-hidden />;
  }
  return <MessageSquare className="size-3.5 shrink-0 opacity-60" aria-hidden />;
}

function deliveryStripeClass(status: string): string {
  switch (status) {
    case "sent":
      return "bg-chart-2";
    case "failed":
      return "bg-destructive";
    case "pending":
      return "bg-muted-foreground/50";
    default:
      return "bg-border";
  }
}

function DeliveryDetailCard({ d }: { d: DeliveryRow }) {
  return (
    <li className="bg-card text-card-foreground relative overflow-hidden rounded-md border border-border/80">
      <div
        className={cn("absolute top-0 bottom-0 left-0 w-0.5", deliveryStripeClass(d.status))}
        aria-hidden
      />
      <div className="flex flex-col gap-2 py-3 pr-3 pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium leading-snug">{d.destinationName}</p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <ChannelGlyph channel={d.channel} />
              {d.channel}
            </p>
          </div>
          <Badge
            variant={d.status === "failed" ? "destructive" : "outline"}
            className={cn(
              "h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize",
              d.status === "sent" &&
                "border-chart-2/35 bg-chart-2/8 text-chart-2 dark:bg-chart-2/12",
              d.status === "pending" && "text-muted-foreground",
            )}
          >
            {d.status}
          </Badge>
        </div>
        {d.error ? (
          <p className="text-destructive border-destructive/15 bg-destructive/5 text-xs leading-snug border-l py-1.5 pr-2 pl-2.5">
            {d.error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function EventPayloadPanel({ content }: { content: string }) {
  const [copied, setCopied] = React.useState(false);
  const canCopy = content.length > 0 && content !== "…" && content !== "Not found";

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-xs font-medium">Payload</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0 gap-1.5 sm:min-h-8"
          disabled={!canCopy}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="divide-border overflow-hidden rounded-md border border-border/80">
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 dark:bg-muted/25 sm:py-2">
          <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-wide uppercase">
            <Code2 className="size-3 opacity-70" aria-hidden />
            JSON
          </span>
          <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
            {canCopy ? `${content.length.toLocaleString()} chars` : "—"}
          </span>
        </div>
        <pre
          className={cn(
            "bg-muted/20 text-foreground p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap sm:text-xs md:p-4 dark:bg-muted/10",
            "selection:bg-muted selection:text-foreground",
          )}
        >
          {content}
        </pre>
      </div>
    </section>
  );
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
        id: "experimentCode",
        accessorFn: (row) => row.experimentCode ?? row.experimentId,
        header: ({ column }) => <SortableHeader column={column} label="Experiment" />,
        cell: ({ row }) => {
          const code = row.original.experimentCode;
          const id = row.original.experimentId;
          const label = code ?? id;
          return (
            <span className="font-mono text-sm underline decoration-muted-foreground/60 underline-offset-2">
              {label}
            </span>
          );
        },
        meta: {
          label: "Experiment",
          placeholder: "Filter by code or id…",
          variant: "text",
          icon: Text,
        },
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column} label="Received" />,
        cell: ({ row }) => {
          const iso = row.getValue<string>("createdAt");
          const d = new Date(iso);
          return (
            <span className="whitespace-nowrap tabular-nums text-muted-foreground" title={iso}>
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
        id: "previousStatus",
        accessorKey: "previousStatus",
        header: ({ column }) => <SortableHeader column={column} label="From" />,
        cell: ({ row }) => {
          const s = row.getValue("previousStatus") as string;
          if ((EXPERIMENT_STATUSES as readonly string[]).includes(s)) {
            return <StatusBadge status={s as ExperimentStatus} />;
          }
          return <span className="text-muted-foreground">{s}</span>;
        },
        meta: { label: "From" },
        enableSorting: true,
      },
      {
        id: "newStatus",
        accessorKey: "newStatus",
        header: ({ column }) => <SortableHeader column={column} label="To" />,
        cell: ({ row }) => {
          const s = row.getValue("newStatus") as string;
          if ((EXPERIMENT_STATUSES as readonly string[]).includes(s)) {
            return <StatusBadge status={s as ExperimentStatus} />;
          }
          return <span>{s}</span>;
        },
        meta: { label: "To" },
        enableSorting: true,
      },
      {
        id: "deliveryIssues",
        accessorFn: (row) => (row.deliveries.failed > 0 ? 1 : 0),
        header: () => (
          <span
            className="text-muted-foreground text-xs font-medium"
            title="Shows when at least one delivery attempt failed"
          >
            Issues
          </span>
        ),
        cell: ({ row }) => {
          const d = row.original.deliveries;
          const total = d.sent + d.failed + d.pending;
          if (total === 0) {
            return <span className="text-muted-foreground text-sm">—</span>;
          }
          if (d.failed > 0) {
            return (
              <span
                className="inline-flex items-center gap-1 text-destructive"
                title={`${d.failed} failed delivery attempt${d.failed === 1 ? "" : "s"}`}
              >
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                <span className="text-xs font-medium tabular-nums">{d.failed}</span>
                <span className="sr-only">
                  {d.failed} failed delivery attempt{d.failed === 1 ? "" : "s"}
                </span>
              </span>
            );
          }
          return <span className="text-muted-foreground text-sm">—</span>;
        },
        meta: { label: "Issues" },
        enableSorting: false,
      },
      {
        id: "deliveries",
        accessorFn: (row) => row.deliveries.sent + row.deliveries.failed + row.deliveries.pending,
        header: () => (
          <span className="text-muted-foreground text-xs font-medium">Deliveries</span>
        ),
        cell: ({ row }) => <DeliveryCountBadges d={row.original.deliveries} />,
        meta: { label: "Deliveries" },
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

  const sheetTitle =
    detailEvent.data?.experimentCode ??
    detailEvent.data?.experimentId ??
    "Event";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 pb-10 sm:gap-5 sm:px-5 sm:pb-12 md:gap-6 md:px-6 lg:px-8">
      <div className="space-y-1.5 sm:space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
          Webhook events
        </h1>
        <p className="text-muted-foreground max-w-prose text-sm leading-relaxed sm:text-sm md:text-base md:leading-relaxed">
          {listQuery.data?.total ?? "…"} events · open a row for details · sort columns · filter by
          experiment.
        </p>
      </div>
      <DataTable
        table={table}
        className="gap-3"
        onRowClick={(row) => {
          setDetailId(row.id);
        }}
      >
        <DataTableToolbar table={table} className="items-stretch px-0 sm:items-start" />
      </DataTable>

      <Sheet
        open={detailId != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            "flex h-full max-h-[100dvh] min-h-0 w-full max-w-[100vw] flex-col gap-0 border-l p-0 sm:max-w-xl",
          )}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-4 text-left pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
            <SheetTitle className="text-foreground pr-10 font-mono text-base font-semibold leading-snug sm:text-lg">
              {detailEvent.isLoading ? (
                <Skeleton className="h-6 w-48 max-w-full" />
              ) : detailEvent.isError ? (
                "Event"
              ) : (
                sheetTitle
              )}
            </SheetTitle>
            {detailEvent.data?.createdAt ? (
              <p className="text-muted-foreground font-mono text-xs tabular-nums">
                {formatDistanceToNow(new Date(detailEvent.data.createdAt), { addSuffix: true })}
              </p>
            ) : null}
            <SheetDescription className="sr-only">
              Webhook payload and delivery results for this event.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {detailEvent.isLoading ? (
              <div className="flex flex-col gap-6 p-4 pb-8 sm:gap-8 sm:p-5">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <div className="overflow-hidden rounded-md border border-border/80">
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-40 w-full rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              </div>
            ) : detailEvent.isError ? (
              <div
                className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
                role="alert"
              >
                <AlertCircle className="text-destructive size-8" strokeWidth={1.75} aria-hidden />
                <p className="text-foreground text-sm font-medium">Could not load event</p>
                <p className="text-muted-foreground text-xs">Close and try again.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 p-4 pb-10 sm:gap-8 sm:p-5">
                <EventPayloadPanel key={detailId ?? "closed"} content={formattedPayload} />
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-muted-foreground text-xs font-medium">Deliveries</h3>
                    {detailDeliveries.data != null && detailDeliveries.data.length > 0 ? (
                      <Badge variant="secondary" className="h-5 font-mono text-[10px] font-medium tabular-nums">
                        {detailDeliveries.data.length}
                      </Badge>
                    ) : null}
                  </div>
                  {detailDeliveries.isLoading ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-16 w-full rounded-md" />
                      <Skeleton className="h-16 w-full rounded-md" />
                    </div>
                  ) : detailDeliveries.data?.length === 0 ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Inbox className="size-4 shrink-0 opacity-50" aria-hidden />
                      No matching destinations.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {detailDeliveries.data?.map((d) => (
                        <DeliveryDetailCard key={d.id} d={d} />
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
