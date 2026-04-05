import type { MiddlewareHandler } from "hono";
import { timingSafeEqual } from "node:crypto";

function timingSafeCompareString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/** Query param `token` must match `expectedToken` (timing-safe). */
export function createWebhookAuth(expectedToken: string): MiddlewareHandler {
  return async (c, next) => {
    const token = c.req.query("token");
    if (!token || !timingSafeCompareString(token, expectedToken)) {
      return c.text("Unauthorized", 401);
    }
    await next();
  };
}
