import type { ExperimentStatus } from "./status-meta";

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
