import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { EXPERIMENT_STATUSES } from "@notify/shared/status-meta";
import { z } from "zod";
const statusList = EXPERIMENT_STATUSES;
/** Providers supported by the installed `use-email` package (HTTPS APIs). */
export const HEADLESS_EMAIL_PROVIDERS = [
    "resend",
    "plunk",
    "sendgrid",
    "postmark",
    "zeptomail",
];
function parseSubscribeStatuses(raw) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) {
        throw new Error("SUBSCRIBE_STATUSES must list at least one experiment status");
    }
    for (const p of parts) {
        if (!statusList.includes(p)) {
            throw new Error(`SUBSCRIBE_STATUSES: unknown status "${p}". Valid: ${EXPERIMENT_STATUSES.join(", ")}`);
        }
    }
    return parts;
}
function parseCsvEmails(s) {
    if (s.trim() === "") {
        return [];
    }
    return s.split(",").map((x) => x.trim()).filter(Boolean);
}
const headlessServerShape = {
    WEBHOOK_TOKEN: z.string().min(1),
    SUBSCRIBE_STATUSES: z.string().min(1).transform(parseSubscribeStatuses),
    EMAIL_RECIPIENTS: z
        .string()
        .optional()
        .default("")
        .transform((s) => parseCsvEmails(s)),
    SLACK_WEBHOOK_URLS: z
        .string()
        .optional()
        .default("")
        .transform((s) => parseCsvEmails(s)),
    EMAIL_PROVIDER: z.enum(HEADLESS_EMAIL_PROVIDERS).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    EMAIL_PROVIDER_KEY: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
};
export const env = createEnv({
    server: headlessServerShape,
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    createFinalSchema: (shape) => z
        .object({
        WEBHOOK_TOKEN: shape.WEBHOOK_TOKEN,
        SUBSCRIBE_STATUSES: shape.SUBSCRIBE_STATUSES,
        EMAIL_RECIPIENTS: shape.EMAIL_RECIPIENTS,
        SLACK_WEBHOOK_URLS: shape.SLACK_WEBHOOK_URLS,
        EMAIL_PROVIDER: shape.EMAIL_PROVIDER,
        EMAIL_FROM: shape.EMAIL_FROM,
        EMAIL_PROVIDER_KEY: shape.EMAIL_PROVIDER_KEY,
        NODE_ENV: shape.NODE_ENV,
    })
        .superRefine((data, ctx) => {
        if (data.EMAIL_RECIPIENTS.length === 0) {
            return;
        }
        if (!data.EMAIL_PROVIDER) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "EMAIL_PROVIDER is required when EMAIL_RECIPIENTS is non-empty",
                path: ["EMAIL_PROVIDER"],
            });
        }
        if (!data.EMAIL_FROM) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "EMAIL_FROM is required when EMAIL_RECIPIENTS is non-empty",
                path: ["EMAIL_FROM"],
            });
        }
        if (!data.EMAIL_PROVIDER_KEY) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "EMAIL_PROVIDER_KEY is required when EMAIL_RECIPIENTS is non-empty",
                path: ["EMAIL_PROVIDER_KEY"],
            });
        }
    }),
});
