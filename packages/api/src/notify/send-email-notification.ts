import { sendMail } from "@notify/nodemailer";
import {
  DASHBOARD_EMAIL_THEME,
  emailDocumentDashboard,
  escapeHtml,
} from "@notify/nodemailer/email-html";

import { statusMeta, type ExperimentStatus } from "../lib/status-meta";
import type { NotificationMessage } from "./build-message";

const t = DASHBOARD_EMAIL_THEME;

function statusPillHtml(status: ExperimentStatus): string {
  const label = escapeHtml(statusMeta[status].label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;border-collapse:separate;border:1px solid ${t.pillBorder};border-radius:${t.radiusPill};background-color:transparent;">
    <tr>
      <td style="padding:6px 10px;vertical-align:middle;font-size:12px;font-weight:400;line-height:1.25;color:${t.pillText};white-space:nowrap;">${label}</td>
    </tr>
  </table>`;
}

export async function sendEmailNotification(
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
