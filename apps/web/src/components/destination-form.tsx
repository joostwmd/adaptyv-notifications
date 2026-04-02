import {
  DEFAULT_TRIGGER_STATUSES,
  EXPERIMENT_STATUSES,
  type ExperimentStatus,
} from "@notify/api/lib/status-meta";
import type { AppRouter } from "@notify/api/routers/index";
import { Button } from "@notify/ui/components/button";
import { Checkbox } from "@notify/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@notify/ui/components/dialog";
import { Input } from "@notify/ui/components/input";
import { Label } from "@notify/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@notify/ui/components/radio-group";
import { cn } from "@notify/ui/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

type DestinationListItem = inferRouterOutputs<AppRouter>["destinations"]["list"][number];

export function DestinationFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DestinationListItem | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"email" | "slack">("email");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = React.useState("");
  const [selectedStatuses, setSelectedStatuses] = React.useState<Set<ExperimentStatus>>(
    () => new Set(DEFAULT_TRIGGER_STATUSES),
  );

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type === "slack" ? "slack" : "email");
      setRecipientEmail(editing.recipientEmail ?? "");
      setSlackWebhookUrl(editing.slackWebhookUrl ?? "");
      setSelectedStatuses(
        new Set(
          editing.experimentStatuses.filter((s): s is ExperimentStatus =>
            (EXPERIMENT_STATUSES as readonly string[]).includes(s),
          ),
        ),
      );
    } else {
      setName("");
      setType("email");
      setRecipientEmail("");
      setSlackWebhookUrl("");
      setSelectedStatuses(new Set(DEFAULT_TRIGGER_STATUSES));
    }
  }, [open, editing]);

  const createMut = useMutation(
    trpc.destinations.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.destinations.list.queryFilter());
        toast.success("Destination created");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const updateMut = useMutation(
    trpc.destinations.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.destinations.list.queryFilter());
        toast.success("Destination updated");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const submitting = createMut.isPending || updateMut.isPending;

  function toggleStatus(s: ExperimentStatus) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size <= 1) {
          toast.error("Keep at least one status selected");
          return prev;
        }
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const experimentStatuses = Array.from(selectedStatuses);
    if (editing) {
      updateMut.mutate({
        id: editing.id,
        name,
        type,
        recipientEmail: type === "email" ? recipientEmail : undefined,
        slackWebhookUrl: type === "slack" ? slackWebhookUrl : undefined,
        experimentStatuses,
        status: editing.status === "paused" ? "paused" : "active",
      });
    } else {
      createMut.mutate({
        name,
        type,
        recipientEmail: type === "email" ? recipientEmail : undefined,
        slackWebhookUrl: type === "slack" ? slackWebhookUrl : undefined,
        experimentStatuses,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit destination" : "New destination"}</DialogTitle>
            <DialogDescription>
              One email address or Slack webhook per destination. Subscribe to experiment statuses
              that should trigger a notification.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dest-name">Name</Label>
              <Input
                id="dest-name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                placeholder="e.g. Lab alerts"
                required
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium">Type</div>
              <RadioGroup
                value={type}
                onValueChange={(v) => setType(v as "email" | "slack")}
                className="grid gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="email" id="dest-type-email" />
                  <Label htmlFor="dest-type-email" className="cursor-pointer font-normal text-sm">
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="slack"
                    id="dest-type-slack"
                    disabled={editing?.type !== "slack"}
                  />
                  <Label
                    htmlFor="dest-type-slack"
                    className={cn(
                      "cursor-pointer font-normal text-sm",
                      editing?.type !== "slack" && "text-muted-foreground",
                    )}
                  >
                    Slack {editing?.type === "slack" ? "" : "(coming soon)"}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {type === "email" ? (
              <div className="grid gap-2">
                <Label htmlFor="dest-email">Recipient email</Label>
                <Input
                  id="dest-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(ev) => setRecipientEmail(ev.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="dest-slack">Slack webhook URL</Label>
                <Input
                  id="dest-slack"
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(ev) => setSlackWebhookUrl(ev.target.value)}
                  placeholder="https://hooks.slack.com/..."
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Notify when experiment moves to</Label>
              <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded border p-2 sm:grid-cols-2">
                {EXPERIMENT_STATUSES.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 text-xs">
                    <Checkbox
                      checked={selectedStatuses.has(s)}
                      onCheckedChange={() => toggleStatus(s)}
                    />
                    <StatusBadge status={s} className="text-[10px]" />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
