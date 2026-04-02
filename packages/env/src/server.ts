import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    WEBHOOK_TOKEN: z.string().min(1),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().default(465),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.string().email(),
    ALLOWED_EMAIL_DOMAINS: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
