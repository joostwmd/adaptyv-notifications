import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import type { ExperimentStatus } from "@notify/shared/status-meta";
import { EXPERIMENT_STATUSES } from "@notify/shared/status-meta";
import { z } from "zod";

const statusList = EXPERIMENT_STATUSES as readonly string[];

function parseSubscribeStatuses(raw: string): ExperimentStatus[] {
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error("SUBSCRIBE_STATUSES must list at least one experiment status");
  }
  for (const p of parts) {
    if (!statusList.includes(p)) {
      throw new Error(
        `SUBSCRIBE_STATUSES: unknown status "${p}". Valid: ${EXPERIMENT_STATUSES.join(", ")}`,
      );
    }
  }
  return parts as ExperimentStatus[];
}

function parseCsvEmails(s: string): string[] {
  if (s.trim() === "") {
    return [];
  }
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export const env = createEnv({
  server: {
    WEBHOOK_TOKEN: z.string().min(1),
    SUBSCRIBE_STATUSES: z.string().min(1).transform(parseSubscribeStatuses),
    EMAIL_RECIPIENTS: z
      .string()
      .optional()
      .default("")
      .transform((s) => parseCsvEmails(s)),
    SLACK_WEBHOOK_URLS: z
      .string()
      .optional()
      .default("")
      .transform((s) => parseCsvEmails(s)),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().default(465),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
