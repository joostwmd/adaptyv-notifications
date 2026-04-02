import type { Context as HonoContext } from "hono";

import type { AppEnv } from "../types";

export function createContext(c: HonoContext<AppEnv>) {
  return {
    user: c.get("user"),
    session: c.get("session"),
    requestId: c.get("requestId"),
  };
}

export type Context = ReturnType<typeof createContext>;
