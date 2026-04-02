import { protectedProcedure, publicProcedure, router } from "../index";

import { deliveriesRouter } from "./deliveries";
import { destinationsRouter } from "./destinations";
import { eventsRouter } from "./events";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.user,
    };
  }),
  events: eventsRouter,
  destinations: destinationsRouter,
  deliveries: deliveriesRouter,
});
export type AppRouter = typeof appRouter;
