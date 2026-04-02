import type { ExperimentStatus } from "@notify/api/lib/status-meta";
import { statusMeta } from "@notify/api/lib/status-meta";
import { Badge } from "@notify/ui/components/badge";
import { cn } from "@notify/ui/lib/utils";
import {
  ChartBar,
  CheckCircle,
  Clock,
  CurrencyDollar,
  Flask,
  MagnifyingGlass,
  NotePencil,
  Package,
  Stack,
  XCircle,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";

const statusIcons: Record<ExperimentStatus, ComponentType<IconProps>> = {
  draft: NotePencil,
  waiting_for_confirmation: Clock,
  quote_sent: CurrencyDollar,
  waiting_for_materials: Package,
  in_queue: Stack,
  in_production: Flask,
  data_analysis: ChartBar,
  in_review: MagnifyingGlass,
  done: CheckCircle,
  canceled: XCircle,
};

export function StatusBadge({
  status,
  className,
}: {
  status: ExperimentStatus;
  className?: string;
}) {
  const m = statusMeta[status];
  const Icon = statusIcons[status];

  return (
    <Badge
      variant="outline"
      render={<span />}
      className={cn("border-l-2 font-normal", m.badgeClassName, className)}
    >
      <Icon
        data-icon="inline-start"
        className="opacity-90"
        weight="regular"
        aria-hidden
      />
      {m.label}
    </Badge>
  );
}
