import type { WebhookEventRow } from "@notify/db/schema/webhook-events";

import {
  type ExperimentStatus,
  isExperimentStatus,
  statusMeta,
} from "../lib/status-meta";

export interface NotificationMessage {
  experimentCode: string | null;
  experimentId: string;
  experimentName: string | null;
  experimentUrl: string | null;
  previousStatus: ExperimentStatus;
  newStatus: ExperimentStatus;
  previousStatusLabel: string;
  newStatusLabel: string;
  timestamp: string;
}

interface ParsedPayload {
  timestamp?: string;
  name?: string;
  experiment?: {
    name?: string | null;
    experiment_url?: string;
  };
}

export function buildNotificationMessage(event: WebhookEventRow): NotificationMessage {
  let parsed: ParsedPayload = {};
  try {
    parsed = JSON.parse(event.rawPayload) as ParsedPayload;
  } catch {
    /* use row fields only */
  }

  const prev = event.previousStatus;
  const next = event.newStatus;
  if (!isExperimentStatus(prev) || !isExperimentStatus(next)) {
    throw new Error(`Invalid status on webhook event ${event.id}`);
  }

  const experimentName =
    parsed.experiment?.name ?? parsed.name ?? null;
  const experimentUrl = parsed.experiment?.experiment_url ?? null;
  const timestamp =
    parsed.timestamp ?? event.createdAt;

  const prevMeta = statusMeta[prev];
  const nextMeta = statusMeta[next];

  return {
    experimentCode: event.experimentCode,
    experimentId: event.experimentId,
    experimentName,
    experimentUrl,
    previousStatus: prev,
    newStatus: next,
    previousStatusLabel: prevMeta.label,
    newStatusLabel: nextMeta.label,
    timestamp,
  };
}
