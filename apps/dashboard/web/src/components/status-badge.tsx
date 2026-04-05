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
      className={cn(
        "h-auto min-h-6 gap-2 px-3 py-1.5 text-xs font-normal leading-none [&_svg]:size-3.5 [&_svg]:shrink-0",
        m.badgeClassName,
        className,
      )}
    >
      <Icon className="opacity-90" weight="regular" aria-hidden />
      {m.label}
    </Badge>
  );
}
