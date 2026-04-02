import { createDb } from "@notify/db";
import * as schema from "@notify/db/schema/auth";
import { env } from "@notify/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { isEmailFromAllowedDomain, parseAllowedEmailDomains } from "./utils/allowed-email-domains";

export function createAuth() {
  const db = createDb();
  const allowedDomains = parseAllowedEmailDomains(env.ALLOWED_EMAIL_DOMAINS);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email" || allowedDomains.length === 0) {
          return;
        }
        const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
        if (!isEmailFromAllowedDomain(email, allowedDomains)) {
          throw new APIError("BAD_REQUEST", {
            message: "Sign-in is unavailable for this email address.",
          });
        }
      }),
    },
  });
}

export const auth = createAuth();
