import { db } from "@notify/db";
import { notifyDeliveries } from "@notify/db/schema/notify-deliveries";
import { notifyDestinations } from "@notify/db/schema/notify-destinations";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const deliveriesRouter = router({
  listByEvent: protectedProcedure
    .input(z.object({ webhookEventId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: notifyDeliveries.id,
          webhookEventId: notifyDeliveries.webhookEventId,
          destinationId: notifyDeliveries.destinationId,
          destinationName: notifyDestinations.name,
          channel: notifyDeliveries.channel,
          status: notifyDeliveries.status,
          error: notifyDeliveries.error,
          createdAt: notifyDeliveries.createdAt,
          completedAt: notifyDeliveries.completedAt,
        })
        .from(notifyDeliveries)
        .innerJoin(
          notifyDestinations,
          eq(notifyDeliveries.destinationId, notifyDestinations.id),
        )
        .where(eq(notifyDeliveries.webhookEventId, input.webhookEventId));

      return rows;
    }),
});
