import { DestinationFormDialog } from "@/components/destination-form";
import { StatusBadge } from "@/components/status-badge";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import type { AppRouter } from "@notify/api/routers/index";
import type { ExperimentStatus } from "@notify/api/lib/status-meta";
import { EXPERIMENT_STATUSES } from "@notify/api/lib/status-meta";
import type { inferRouterOutputs } from "@trpc/server";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@notify/ui/components/alert-dialog";
import { Button } from "@notify/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@notify/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notify/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notify/ui/components/empty";
import { Skeleton } from "@notify/ui/components/skeleton";
import { Status, StatusIndicator, StatusLabel } from "@notify/ui/components/status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  BellSimple,
  CopySimple,
  DotsThreeVertical,
  Pause,
  PencilSimple,
  Play,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import * as React from "react";
import { toast } from "sonner";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type DestinationRow = RouterOutputs["destinations"]["list"][number];

export const Route = createFileRoute("/destinations")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function destinationAddress(d: DestinationRow) {
  return d.type === "email" ? (d.recipientEmail ?? "—") : (d.slackWebhookUrl ?? "Slack");
}

function toUpdateInput(
  d: DestinationRow,
  overrides: Partial<{ status: "active" | "paused" }> = {},
) {
  const status = overrides.status ?? (d.status === "paused" ? "paused" : "active");
  const experimentStatuses = d.experimentStatuses.filter((s): s is ExperimentStatus =>
    (EXPERIMENT_STATUSES as readonly string[]).includes(s),
  );
  return {
    id: d.id,
    name: d.name,
    type: d.type as "email" | "slack",
    recipientEmail: d.type === "email" ? (d.recipientEmail ?? undefined) : undefined,
    slackWebhookUrl: d.type === "slack" ? (d.slackWebhookUrl ?? undefined) : undefined,
    experimentStatuses,
    status,
  };
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DestinationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DestinationRow | null>(null);

  const listQuery = useQuery(trpc.destinations.list.queryOptions());
  const webhookUrlQuery = useQuery(trpc.destinations.webhookUrl.queryOptions());

  const list: DestinationRow[] = listQuery.data ?? [];

  const updateMut = useMutation(
    trpc.destinations.update.mutationOptions({
      onSuccess: (_, vars) => {
        void queryClient.invalidateQueries(trpc.destinations.list.queryFilter());
        toast.success(vars.status === "paused" ? "Destination paused" : "Destination activated");
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const deleteMut = useMutation(
    trpc.destinations.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.destinations.list.queryFilter());
        toast.success("Destination removed");
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  function copyWebhookUrl() {
    const url = webhookUrlQuery.data;
    if (!url) return;
    void navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied");
  }

  function openNewDestination() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Destinations</h1>
          <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
            Where to send notifications for experiment status changes.
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-1.5 self-start sm:self-auto" onClick={openNewDestination}>
          <Plus className="size-4" weight="regular" />
          New destination
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Foundry webhook URL</CardTitle>
          <CardDescription>Paste into the experiment webhook field in Foundry.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="min-w-0 flex-1">
            {webhookUrlQuery.isLoading ? (
              <Skeleton className="h-9 w-full rounded-none font-mono" />
            ) : webhookUrlQuery.isError ? (
              <p className="text-destructive text-xs leading-relaxed" role="alert">
                Could not load the webhook URL. Check your connection and refresh the page.
              </p>
            ) : (
              <code
                className="bg-muted text-muted-foreground block max-w-full overflow-x-auto rounded-none border px-2.5 py-2 font-mono text-xs leading-normal break-all"
                title={webhookUrlQuery.data}
              >
                {webhookUrlQuery.data}
              </code>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 sm:self-center"
            onClick={copyWebhookUrl}
            disabled={!webhookUrlQuery.data || webhookUrlQuery.isLoading}
          >
            <CopySimple className="size-3.5" weight="regular" />
            Copy
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3" aria-busy={listQuery.isLoading} aria-live="polite">
        {listQuery.isLoading ? (
          <Card>
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full max-w-xs" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-14 w-full" />
            </CardContent>
          </Card>
        ) : list.length === 0 ? (
          <Empty className="min-h-[min(280px,45vh)] rounded-none border border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellSimple className="size-4" weight="regular" />
              </EmptyMedia>
              <EmptyTitle>No destinations yet</EmptyTitle>
              <EmptyDescription className="max-w-sm">
                Add one to get notified when experiments hit statuses you care about.
              </EmptyDescription>
            </EmptyHeader>
            <Button type="button" className="gap-1.5" onClick={openNewDestination}>
              <Plus className="size-4" weight="regular" />
              New destination
            </Button>
          </Empty>
        ) : (
          list.map((d) => {
            const address = destinationAddress(d);
            return (
            <Card key={d.id}>
              <CardHeader className="space-y-0 pb-2">
                <div className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base leading-snug" title={d.name}>
                      {d.name}
                    </CardTitle>
                    <CardDescription
                      className="mt-1 truncate font-mono text-xs"
                      title={address === "—" || address === "Slack" ? undefined : address}
                    >
                      {address}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <Status variant={d.status === "active" ? "success" : "warning"}>
                      <StatusIndicator />
                      <StatusLabel>{d.status === "active" ? "Active" : "Paused"}</StatusLabel>
                    </Status>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-9 shrink-0 text-muted-foreground hover:text-foreground sm:size-8"
                            aria-label={`Actions for ${d.name}`}
                          />
                        }
                      >
                        <DotsThreeVertical className="size-4" weight="bold" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(d);
                            setFormOpen(true);
                          }}
                        >
                          <PencilSimple className="size-4" weight="regular" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            updateMut.isPending && updateMut.variables?.id === d.id
                          }
                          onClick={() => {
                            const next = d.status === "active" ? "paused" : "active";
                            updateMut.mutate(toUpdateInput(d, { status: next }));
                          }}
                        >
                          {d.status === "active" ? (
                            <Pause className="size-4" weight="regular" />
                          ) : (
                            <Play className="size-4" weight="regular" />
                          )}
                          {d.status === "active" ? "Pause" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(d)}
                        >
                          <Trash className="size-4" weight="regular" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-0">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">Notify on</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.experimentStatuses
                      .filter((s): s is ExperimentStatus =>
                        (EXPERIMENT_STATUSES as readonly string[]).includes(s),
                      )
                      .map((s) => (
                        <StatusBadge key={s} status={s} />
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>

      <DestinationFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove destination?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Remove “${deleteTarget.name}”? Destinations with deliveries can’t be deleted—pause instead.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMut.mutate(
                  { id: deleteTarget.id },
                  {
                    onSuccess: () => setDeleteTarget(null),
                  },
                );
              }}
            >
              {deleteMut.isPending ? "Removing…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
