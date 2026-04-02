import type { ExperimentStatus } from "@notify/api/lib/status-meta";
import { statusMeta } from "@notify/api/lib/status-meta";
import { Badge } from "@notify/ui/components/badge";
import { cn } from "@notify/ui/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: ExperimentStatus;
  className?: string;
}) {
  const m = statusMeta[status];
  return (
    <Badge
      variant="outline"
      className={cn("border-l-2 font-normal", m.badgeClassName, className)}
    >
      <span className="mr-1" aria-hidden>
        {m.emoji}
      </span>
      {m.label}
    </Badge>
  );
}
