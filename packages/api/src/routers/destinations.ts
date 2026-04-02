import { db } from "@notify/db";
import { destinationTriggers } from "@notify/db/schema/destination-triggers";
import { notifyDeliveries } from "@notify/db/schema/notify-deliveries";
import { notifyDestinations } from "@notify/db/schema/notify-destinations";
import { webhookEvents } from "@notify/db/schema/webhook-events";
import { count, eq } from "drizzle-orm";
import { env } from "@notify/env/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { EXPERIMENT_STATUSES, type ExperimentStatus } from "../lib/status-meta";
import { sendTestEmail } from "../notify/send-test-email";
import { protectedProcedure, router } from "../index";

const destinationTypeSchema = z.enum(["email", "slack"]);
const destinationStatusSchema = z.enum(["active", "paused"]);

const triggersSchema = z
  .array(z.enum(EXPERIMENT_STATUSES))
  .min(1, "Select at least one status");

const createInput = z.object({
  name: z.string().min(1).max(200),
  type: destinationTypeSchema,
  recipientEmail: z.string().email().optional(),
  slackWebhookUrl: z.string().url().optional(),
  experimentStatuses: triggersSchema,
});

const updateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  type: destinationTypeSchema,
  recipientEmail: z.string().email().optional(),
  slackWebhookUrl: z.string().url().optional(),
  experimentStatuses: triggersSchema,
  status: destinationStatusSchema,
});

function validateDestinationPayload(
  type: z.infer<typeof destinationTypeSchema>,
  recipientEmail: string | undefined,
  slackWebhookUrl: string | undefined,
) {
  if (type === "email") {
    if (!recipientEmail?.trim()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email destinations require a recipient address",
      });
    }
  }
  if (type === "slack") {
    if (!slackWebhookUrl?.trim()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Slack destinations require a webhook URL",
      });
    }
  }
}

export const destinationsRouter = router({
  webhookUrl: protectedProcedure.query(() => {
    const base = env.BETTER_AUTH_URL.replace(/\/$/, "");
    return `${base}/webhook?token=${encodeURIComponent(env.WEBHOOK_TOKEN)}`;
  }),

  list: protectedProcedure.query(async () => {
    const destRows = await db.select().from(notifyDestinations);
    const triggerRows = await db.select().from(destinationTriggers);

    const triggersByDest = new Map<string, ExperimentStatus[]>();
    for (const t of triggerRows) {
      const list = triggersByDest.get(t.destinationId) ?? [];
      if (isExperimentStatus(t.experimentStatus)) {
        list.push(t.experimentStatus);
      }
      triggersByDest.set(t.destinationId, list);
    }

    return destRows.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      recipientEmail: d.recipientEmail,
      slackWebhookUrl: d.slackWebhookUrl,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      experimentStatuses: triggersByDest.get(d.id) ?? [],
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [d] = await db
        .select()
        .from(notifyDestinations)
        .where(eq(notifyDestinations.id, input.id))
        .limit(1);
      if (!d) return null;

      const triggers = await db
        .select()
        .from(destinationTriggers)
        .where(eq(destinationTriggers.destinationId, input.id));

      return {
        id: d.id,
        name: d.name,
        type: d.type,
        recipientEmail: d.recipientEmail,
        slackWebhookUrl: d.slackWebhookUrl,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        experimentStatuses: triggers
          .map((t) => t.experimentStatus)
          .filter(isExperimentStatus),
      };
    }),

  create: protectedProcedure.input(createInput).mutation(async ({ input }) => {
    validateDestinationPayload(
      input.type,
      input.recipientEmail,
      input.slackWebhookUrl,
    );

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      await tx.insert(notifyDestinations).values({
        id,
        name: input.name,
        type: input.type,
        recipientEmail: input.recipientEmail?.trim() ?? null,
        slackWebhookUrl: input.slackWebhookUrl?.trim() ?? null,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(destinationTriggers).values(
        input.experimentStatuses.map((experimentStatus) => ({
          destinationId: id,
          experimentStatus,
        })),
      );
    });

    return { id };
  }),

  update: protectedProcedure.input(updateInput).mutation(async ({ input }) => {
    validateDestinationPayload(
      input.type,
      input.recipientEmail,
      input.slackWebhookUrl,
    );

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(notifyDestinations)
        .where(eq(notifyDestinations.id, input.id))
        .limit(1);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Destination not found",
        });
      }

      await tx
        .update(notifyDestinations)
        .set({
          name: input.name,
          type: input.type,
          recipientEmail: input.recipientEmail?.trim() ?? null,
          slackWebhookUrl: input.slackWebhookUrl?.trim() ?? null,
          status: input.status,
          updatedAt: now,
        })
        .where(eq(notifyDestinations.id, input.id));

      await tx
        .delete(destinationTriggers)
        .where(eq(destinationTriggers.destinationId, input.id));

      await tx.insert(destinationTriggers).values(
        input.experimentStatuses.map((experimentStatus) => ({
          destinationId: input.id,
          experimentStatus,
        })),
      );
    });

    return { ok: true as const };
  }),

  sendTest: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [d] = await db
        .select()
        .from(notifyDestinations)
        .where(eq(notifyDestinations.id, input.id))
        .limit(1);

      if (!d) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Destination not found",
        });
      }

      if (d.type !== "email") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Test notifications are only supported for email destinations",
        });
      }

      const email = d.recipientEmail?.trim();
      if (!email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email destinations require a recipient address",
        });
      }

      const eventId = crypto.randomUUID();
      const deliveryId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(webhookEvents).values({
        id: eventId,
        experimentId: "test",
        experimentCode: null,
        previousStatus: "draft",
        newStatus: "draft",
        rawPayload: "{}",
        isTest: true,
        createdAt: now,
      });

      await db.insert(notifyDeliveries).values({
        id: deliveryId,
        webhookEventId: eventId,
        destinationId: d.id,
        channel: "email",
        status: "pending",
        error: null,
        createdAt: now,
        completedAt: null,
      });

      try {
        await sendTestEmail(email, d.name);
        await db
          .update(notifyDeliveries)
          .set({
            status: "sent",
            completedAt: new Date().toISOString(),
          })
          .where(eq(notifyDeliveries.id, deliveryId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await db
          .update(notifyDeliveries)
          .set({
            status: "failed",
            error: msg.slice(0, 2000),
            completedAt: new Date().toISOString(),
          })
          .where(eq(notifyDeliveries.id, deliveryId));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: msg.slice(0, 500) || "Failed to send test email",
        });
      }

      return { ok: true as const };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .select({ c: count() })
        .from(notifyDeliveries)
        .where(eq(notifyDeliveries.destinationId, input.id));
      if ((row?.c ?? 0) > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Cannot delete a destination that has deliveries. Pause it instead.",
        });
      }
      await db.delete(notifyDestinations).where(eq(notifyDestinations.id, input.id));
      return { ok: true as const };
    }),
});

function isExperimentStatus(s: string): s is ExperimentStatus {
  return (EXPERIMENT_STATUSES as readonly string[]).includes(s);
}
