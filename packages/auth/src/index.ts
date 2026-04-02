import { createDb } from "@notify/db";
import * as schema from "@notify/db/schema/auth";
import { env } from "@notify/env/server";
import { sendMail } from "@notify/nodemailer";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";

import { isEmailFromAllowedDomain, parseAllowedEmailDomains } from "./utils/allowed-email-domains";

const OTP_SEND_PATH = "/email-otp/send-verification-otp";

export function createAuth() {
  const db = createDb();
  const allowedDomains = parseAllowedEmailDomains(env.ALLOWED_EMAIL_DOMAINS);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        disableSignUp: false,
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in") {
            return;
          }
          const text = `Your sign-in code is: ${otp}\n\nThis code expires in 5 minutes.`;
          const html = `<p>Your sign-in code is:</p><p style="font-size: 1.5rem; font-weight: bold; letter-spacing: 0.2em;">${otp}</p><p>This code expires in 5 minutes.</p>`;
          void sendMail({
            to: email,
            subject: "Your sign-in code",
            html,
            text,
          }).catch((err) => {
            console.error("[auth] Failed to send OTP email:", err);
          });
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (allowedDomains.length === 0) {
          return;
        }
        if (ctx.path !== OTP_SEND_PATH) {
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
