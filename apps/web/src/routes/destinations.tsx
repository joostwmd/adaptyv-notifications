import { DestinationFormDialog } from "@/components/destination-form";
import { StatusBadge } from "@/components/status-badge";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import type { AppRouter } from "@notify/api/routers/index";
import type { ExperimentStatus } from "@notify/api/lib/status-meta";
import { EXPERIMENT_STATUSES } from "@notify/api/lib/status-meta";
import type { inferRouterOutputs } from "@trpc/server";
import { Badge } from "@notify/ui/components/badge";
import { Button } from "@notify/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@notify/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
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

function RouteComponent() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DestinationRow | null>(null);

  const listQuery = useQuery(trpc.destinations.list.queryOptions());
  const webhookUrlQuery = useQuery(trpc.destinations.webhookUrl.queryOptions());

  const list: DestinationRow[] = listQuery.data ?? [];

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

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Destinations</h1>
        <p className="text-muted-foreground text-sm">
          Configure who receives email when an experiment reaches a subscribed status.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Adaptyv webhook URL</CardTitle>
          <CardDescription>
            Paste this URL in Foundry when creating or editing an experiment webhook.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="bg-muted text-muted-foreground max-w-full flex-1 overflow-x-auto rounded border px-2 py-1.5 font-mono text-xs break-all">
            {webhookUrlQuery.data ?? "…"}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            onClick={copyWebhookUrl}
            disabled={!webhookUrlQuery.data}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          className="gap-1"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          New destination
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {listQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No destinations yet. Create one to start receiving email notifications.
          </p>
        ) : (
          list.map((d) => (
            <Card key={d.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{d.name}</CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">
                    {d.type === "email"
                      ? (d.recipientEmail ?? "—")
                      : (d.slackWebhookUrl ?? "Slack")}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Badge variant={d.status === "active" ? "default" : "secondary"}>
                    {d.status === "active" ? "Active" : "Paused"}
                  </Badge>
                  <Badge variant="outline">{d.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">Subscribed statuses</p>
                  <div className="flex flex-wrap gap-1">
                    {d.experimentStatuses
                      .filter((s): s is ExperimentStatus =>
                        (EXPERIMENT_STATUSES as readonly string[]).includes(s),
                      )
                      .map((s) => (
                        <StatusBadge key={s} status={s} className="text-[10px]" />
                      ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setEditing(d);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive gap-1"
                    onClick={() => {
                      if (confirm(`Delete destination “${d.name}”?`)) {
                        deleteMut.mutate({ id: d.id });
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <DestinationFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </div>
  );
}
