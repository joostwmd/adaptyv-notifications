import { env } from "@notify/env/headless";
import {
  DASHBOARD_EMAIL_THEME,
  emailDocumentDashboard,
  escapeHtml,
} from "@notify/nodemailer/email-html";
import type { SendMailInput } from "@notify/nodemailer/mailer";
import type { NotificationMessage } from "@notify/shared/types";
import { statusMeta, type ExperimentStatus } from "@notify/shared/status-meta";
import { webhookPayloadSchema } from "@notify/shared/webhook-schema";
import type { z } from "zod";

import { postSlackExperimentUpdate, postSlackTest } from "./slack";

type SendMailFn = (input: SendMailInput) => Promise<unknown>;

type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

const t = DASHBOARD_EMAIL_THEME;

function statusPillHtml(status: ExperimentStatus): string {
  const label = escapeHtml(statusMeta[status].label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;border-collapse:separate;border:1px solid ${t.pillBorder};border-radius:${t.radiusPill};background-color:transparent;">
    <tr>
      <td style="padding:6px 10px;vertical-align:middle;font-size:12px;font-weight:400;line-height:1.25;color:${t.pillText};white-space:nowrap;">${label}</td>
    </tr>
  </table>`;
}

export function buildNotificationMessageFromPayload(data: WebhookPayload): NotificationMessage {
  const experimentCode = data.experiment_code ?? data.experiment?.code ?? null;
  const experimentName = data.experiment?.name ?? data.name ?? null;
  const experimentUrl = data.experiment?.experiment_url ?? null;
  const timestamp = data.timestamp ?? new Date().toISOString();
  const prev = data.previous_status;
  const next = data.new_status;

  return {
    experimentCode,
    experimentId: data.experiment_id,
    experimentName,
    experimentUrl,
    previousStatus: prev,
    newStatus: next,
    previousStatusLabel: statusMeta[prev].label,
    newStatusLabel: statusMeta[next].label,
    timestamp,
  };
}

async function sendExperimentEmail(
  sendMail: SendMailFn,
  to: string,
  message: NotificationMessage,
): Promise<void> {
  const codeOrId = message.experimentCode ?? message.experimentId;
  const subject = `Experiment ${codeOrId}: ${message.newStatusLabel}`;

  const prevLabel = statusMeta[message.previousStatus].label;
  const nextLabel = statusMeta[message.newStatus].label;
  const prevPill = statusPillHtml(message.previousStatus);
  const nextPill = statusPillHtml(message.newStatus);

  const nameBlock =
    message.experimentName != null && message.experimentName.length > 0
      ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:${t.mutedForeground};">${escapeHtml(message.experimentName)}</p>`
      : "";

  const button =
    message.experimentUrl != null && message.experimentUrl.length > 0
      ? `<p style="margin:26px 0 0;">
          <a href="${escapeHtml(message.experimentUrl)}"
             style="display:inline-block;padding:10px 18px;background-color:${t.primaryButtonBg};color:${t.primaryButtonFg};text-decoration:none;font-size:14px;font-weight:500;border-radius:${t.radiusButton};">
            View in Foundry
          </a>
        </p>`
      : "";

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${t.mutedForeground};">Experiment</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;"><tr><td bgcolor="${t.codeBackground}" style="padding:10px 12px;border:1px solid ${t.codeBorder};border-radius:${t.radiusPill};background-color:${t.codeBackground};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px;font-weight:500;line-height:1.4;color:${t.foreground};">${escapeHtml(codeOrId)}</td></tr></table>
    ${nameBlock}
    <p style="margin:0 0 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${t.mutedForeground};">Status</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="vertical-align:middle;line-height:0;">${prevPill}</td>
        <td style="vertical-align:middle;padding:0 6px;font-size:14px;color:${t.mutedForeground};" aria-hidden="true">→</td>
        <td style="vertical-align:middle;line-height:0;">${nextPill}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:1.5;color:${t.mutedForeground};">${escapeHtml(message.timestamp)}</p>
    ${button}
  `.trim();

  const html = emailDocumentDashboard({
    heading: "Experiment status updated",
    preheader: `${nextLabel} · ${codeOrId}`,
    bodyHtml,
  });

  const text = [
    "Experiment status updated",
    `Experiment: ${codeOrId}`,
    message.experimentName ? `Name: ${message.experimentName}` : null,
    `Status: ${prevLabel} → ${nextLabel}`,
    `Time: ${message.timestamp}`,
    message.experimentUrl ? `Link: ${message.experimentUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMail({
    to,
    subject,
    html,
    text,
  });
}

export interface FanOutSummary {
  email: { attempted: number; failed: number };
  slack: { attempted: number; failed: number };
  errors: string[];
}

export async function fanOutHeadless(
  sendMail: SendMailFn,
  data: WebhookPayload,
): Promise<FanOutSummary> {
  const message = buildNotificationMessageFromPayload(data);
  const errors: string[] = [];
  let emailAttempted = 0;
  let emailFailed = 0;
  for (const to of env.EMAIL_RECIPIENTS) {
    emailAttempted++;
    try {
      await sendExperimentEmail(sendMail, to, message);
    } catch (e) {
      emailFailed++;
      errors.push(`email:${to}:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let slackAttempted = 0;
  let slackFailed = 0;
  for (const url of env.SLACK_WEBHOOK_URLS) {
    slackAttempted++;
    try {
      const codeOrId = message.experimentCode ?? message.experimentId;
      await postSlackExperimentUpdate(url, {
        experimentCodeOrId: codeOrId,
        experimentName: message.experimentName,
        previousStatus: message.previousStatus,
        newStatus: message.newStatus,
        experimentUrl: message.experimentUrl,
        timestamp: message.timestamp,
      });
    } catch (e) {
      slackFailed++;
      const label = url.slice(0, 48);
      errors.push(`slack:${label}:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    email: { attempted: emailAttempted, failed: emailFailed },
    slack: { attempted: slackAttempted, failed: slackFailed },
    errors,
  };
}

async function sendTestEmail(sendMail: SendMailFn, to: string): Promise<void> {
  const subject = "Test notification from Foundry Notify (headless)";
  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${t.foreground};">
      This is a test message from the <strong style="font-weight:600;">headless</strong> Notify server.
    </p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:${t.mutedForeground};">
      If you received this email, your email provider and recipients are configured correctly.
    </p>
  `.trim();

  const html = emailDocumentDashboard({
    heading: "Hello",
    preheader: "Headless test",
    bodyHtml,
  });

  const text = [
    "Hello",
    "",
    "This is a test message from the headless Foundry Notify server.",
    "",
    "If you received this email, your email provider and recipients are configured correctly.",
  ].join("\n");

  await sendMail({ to, subject, html, text });
}

export async function runHeadlessTest(sendMail: SendMailFn): Promise<{
  email: { results: { to: string; ok: boolean; error?: string }[] };
  slack: { results: { url: string; ok: boolean; error?: string }[] };
}> {
  console.info("[headless:test] runHeadlessTest start", {
    emailRecipients: env.EMAIL_RECIPIENTS.length,
    slackWebhooks: env.SLACK_WEBHOOK_URLS.length,
    emailProvider:
      env.EMAIL_RECIPIENTS.length > 0 ? env.EMAIL_PROVIDER : "(email disabled)",
  });

  if (env.EMAIL_RECIPIENTS.length === 0 && env.SLACK_WEBHOOK_URLS.length === 0) {
    console.warn(
      "[headless:test] no EMAIL_RECIPIENTS or SLACK_WEBHOOK_URLS — returning immediately (check Render env)",
    );
  }

  const emailResults: { to: string; ok: boolean; error?: string }[] = [];
  let i = 0;
  for (const to of env.EMAIL_RECIPIENTS) {
    i += 1;
    const t0 = Date.now();
    console.info("[headless:test] email send start", {
      index: i,
      total: env.EMAIL_RECIPIENTS.length,
      toDomain: to.includes("@") ? to.split("@")[1] : "(no @)",
    });
    try {
      await sendTestEmail(sendMail, to);
      console.info("[headless:test] email send ok", { index: i, ms: Date.now() - t0 });
      emailResults.push({ to, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[headless:test] email send fail", {
        index: i,
        ms: Date.now() - t0,
        error: msg,
      });
      emailResults.push({
        to,
        ok: false,
        error: msg,
      });
    }
  }

  const slackResults: { url: string; ok: boolean; error?: string }[] = [];
  let j = 0;
  for (const url of env.SLACK_WEBHOOK_URLS) {
    j += 1;
    const t0 = Date.now();
    let host = "(bad-url)";
    try {
      host = new URL(url).host;
    } catch {
      /* keep */
    }
    console.info("[headless:test] slack POST start", {
      index: j,
      total: env.SLACK_WEBHOOK_URLS.length,
      host,
    });
    try {
      await postSlackTest(url);
      console.info("[headless:test] slack POST ok", { index: j, ms: Date.now() - t0, host });
      slackResults.push({ url, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[headless:test] slack POST fail", {
        index: j,
        ms: Date.now() - t0,
        host,
        error: msg,
      });
      slackResults.push({
        url,
        ok: false,
        error: msg,
      });
    }
  }

  console.info("[headless:test] runHeadlessTest done", {
    emailOk: emailResults.filter((r) => r.ok).length,
    emailFail: emailResults.filter((r) => !r.ok).length,
    slackOk: slackResults.filter((r) => r.ok).length,
    slackFail: slackResults.filter((r) => !r.ok).length,
  });

  return { email: { results: emailResults }, slack: { results: slackResults } };
}
