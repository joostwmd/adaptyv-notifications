import type { auth } from "@notify/auth";

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    requestId: string;
  };
};
