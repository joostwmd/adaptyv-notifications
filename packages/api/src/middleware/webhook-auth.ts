import { env } from "@notify/env/server";
import { createWebhookAuth } from "@notify/shared/webhook-auth";

export const webhookAuth = createWebhookAuth(env.WEBHOOK_TOKEN);
