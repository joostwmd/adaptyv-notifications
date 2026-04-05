import { z } from "zod";

/** Adaptyv Foundry experiment lifecycle statuses (snake_case). */
export const EXPERIMENT_STATUSES = [
  "draft",
  "waiting_for_confirmation",
  "quote_sent",
  "waiting_for_materials",
  "in_queue",
  "in_production",
  "data_analysis",
  "in_review",
  "done",
  "canceled",
] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const experimentStatusSchema = z.enum(EXPERIMENT_STATUSES);

export const DEFAULT_TRIGGER_STATUSES: ExperimentStatus[] = [
  "quote_sent",
  "done",
  "canceled",
];

/** Shared StatusBadge (web UI) chrome; `slackColor` reserved for future rich notifications. */
export const statusBadgeClassName = "border-muted-foreground/40 text-muted-foreground";

export const statusMeta: Record<
  ExperimentStatus,
  {
    label: string;
    slackColor: string;
    /** Tailwind classes for StatusBadge in the app (uniform muted treatment). */
    badgeClassName: string;
  }
> = {
  draft: {
    label: "Draft",
    slackColor: "#808080",
    badgeClassName: statusBadgeClassName,
  },
  waiting_for_confirmation: {
    label: "Waiting for Confirmation",
    slackColor: "#E8A317",
    badgeClassName: statusBadgeClassName,
  },
  quote_sent: {
    label: "Quote Sent",
    slackColor: "#3498DB",
    badgeClassName: statusBadgeClassName,
  },
  waiting_for_materials: {
    label: "Waiting for Materials",
    slackColor: "#E8A317",
    badgeClassName: statusBadgeClassName,
  },
  in_queue: {
    label: "In Queue",
    slackColor: "#E8A317",
    badgeClassName: statusBadgeClassName,
  },
  in_production: {
    label: "In Production",
    slackColor: "#9B59B6",
    badgeClassName: statusBadgeClassName,
  },
  data_analysis: {
    label: "Data Analysis",
    slackColor: "#9B59B6",
    badgeClassName: statusBadgeClassName,
  },
  in_review: {
    label: "In Review",
    slackColor: "#9B59B6",
    badgeClassName: statusBadgeClassName,
  },
  done: {
    label: "Done",
    slackColor: "#27AE60",
    badgeClassName: statusBadgeClassName,
  },
  canceled: {
    label: "Canceled",
    slackColor: "#E74C3C",
    badgeClassName: statusBadgeClassName,
  },
};

export function isExperimentStatus(s: string): s is ExperimentStatus {
  return (EXPERIMENT_STATUSES as readonly string[]).includes(s);
}
