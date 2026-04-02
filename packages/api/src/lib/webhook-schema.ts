import { z } from "zod";

const experimentStatusSchema = z.enum([
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
]);

export const webhookPayloadSchema = z
  .object({
    experiment_id: z.string(),
    previous_status: experimentStatusSchema,
    new_status: experimentStatusSchema,
    experiment_code: z.string().optional(),
    timestamp: z.string().optional(),
    name: z.string().optional(),
    experiment: z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string().nullable().optional(),
        status: experimentStatusSchema,
        experiment_type: z.string().optional(),
        results_status: z.string().optional(),
        experiment_url: z.string().optional(),
        created_at: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();
