import { env } from "@notify/env/server";
import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "node:crypto";

import type { AppEnv } from "../types";

function timingSafeCompareString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export const webhookAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = c.req.query("token");
  if (!token || !timingSafeCompareString(token, env.WEBHOOK_TOKEN)) {
    return c.text("Unauthorized", 401);
  }
  await next();
});
