import type { HeadlessEmailProvider } from "@notify/env/headless";

/** `process.env` keys that `use-email` reads per provider (use-email@0.0.10). */
const providerProcessEnvKey: Record<HeadlessEmailProvider, string> = {
  resend: "RESEND_API_TOKEN",
  plunk: "PLUNK_API_TOKEN",
  sendgrid: "SENDGRID_API_KEY",
  postmark: "POSTMARK_SERVER_TOKEN",
  zeptomail: "ZEPTOMAIL_API_KEY",
};

/**
 * Copies `EMAIL_PROVIDER_KEY` into the env var name expected by `use-email`
 * for the selected provider. Call once before `useEmail(provider)`.
 */
export function applyUseEmailEnvBridge(
  provider: HeadlessEmailProvider,
  providerKey: string,
): void {
  const target = providerProcessEnvKey[provider];
  process.env[target] = providerKey;
}
