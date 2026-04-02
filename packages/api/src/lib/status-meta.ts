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

export const statusMeta: Record<
  ExperimentStatus,
  {
    label: string;
    emoji: string;
    slackColor: string;
    /** Tailwind classes for shadcn Badge (border accent). */
    badgeClassName: string;
  }
> = {
  draft: {
    label: "Draft",
    emoji: "\u{1F4DD}",
    slackColor: "#808080",
    badgeClassName: "border-muted-foreground/40 text-muted-foreground",
  },
  waiting_for_confirmation: {
    label: "Waiting for Confirmation",
    emoji: "\u{23F3}",
    slackColor: "#E8A317",
    badgeClassName: "border-amber-500/60 text-amber-700 dark:text-amber-400",
  },
  quote_sent: {
    label: "Quote Sent",
    emoji: "\u{1F4B0}",
    slackColor: "#3498DB",
    badgeClassName: "border-sky-500/60 text-sky-700 dark:text-sky-400",
  },
  waiting_for_materials: {
    label: "Waiting for Materials",
    emoji: "\u{1F4E6}",
    slackColor: "#E8A317",
    badgeClassName: "border-amber-500/60 text-amber-700 dark:text-amber-400",
  },
  in_queue: {
    label: "In Queue",
    emoji: "\u{1F51C}",
    slackColor: "#E8A317",
    badgeClassName: "border-amber-500/60 text-amber-700 dark:text-amber-400",
  },
  in_production: {
    label: "In Production",
    emoji: "\u{1F9EA}",
    slackColor: "#9B59B6",
    badgeClassName: "border-violet-500/60 text-violet-700 dark:text-violet-400",
  },
  data_analysis: {
    label: "Data Analysis",
    emoji: "\u{1F4CA}",
    slackColor: "#9B59B6",
    badgeClassName: "border-violet-500/60 text-violet-700 dark:text-violet-400",
  },
  in_review: {
    label: "In Review",
    emoji: "\u{1F50D}",
    slackColor: "#9B59B6",
    badgeClassName: "border-violet-500/60 text-violet-700 dark:text-violet-400",
  },
  done: {
    label: "Done",
    emoji: "\u2705",
    slackColor: "#27AE60",
    badgeClassName: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400",
  },
  canceled: {
    label: "Canceled",
    emoji: "\u274C",
    slackColor: "#E74C3C",
    badgeClassName: "border-red-500/60 text-red-700 dark:text-red-400",
  },
};

export function isExperimentStatus(s: string): s is ExperimentStatus {
  return (EXPERIMENT_STATUSES as readonly string[]).includes(s);
}
