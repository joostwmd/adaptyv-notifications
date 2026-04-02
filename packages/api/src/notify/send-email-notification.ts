import { sendMail } from "@notify/nodemailer";
import { EMAIL_THEME, emailDocument, escapeHtml } from "@notify/nodemailer/email-html";

import type { NotificationMessage } from "./build-message";

export async function sendEmailNotification(
  to: string,
  message: NotificationMessage,
): Promise<void> {
  const t = EMAIL_THEME;
  const codeOrId = message.experimentCode ?? message.experimentId;
  const subject = `${message.newStatusEmoji} Experiment ${codeOrId}: ${message.newStatusLabel}`;

  const nameBlock =
    message.experimentName != null && message.experimentName.length > 0
      ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:${t.mutedForeground};">${escapeHtml(message.experimentName)}</p>`
      : "";

  const button =
    message.experimentUrl != null && message.experimentUrl.length > 0
      ? `<p style="margin:24px 0 0;">
          <a href="${escapeHtml(message.experimentUrl)}"
             style="display:inline-block;padding:10px 18px;background-color:${t.primary};color:${t.primaryForeground};text-decoration:none;font-size:14px;font-weight:500;border-radius:${t.radiusButton};">
            View in Foundry
          </a>
        </p>`
      : "";

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${t.mutedForeground};">Experiment</p>
    <p style="margin:0 0 20px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:15px;font-weight:500;line-height:1.4;color:${t.foreground};">${escapeHtml(codeOrId)}</p>
    ${nameBlock}
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${t.mutedForeground};">Status</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:${t.foreground};">
      <span style="font-weight:600;">${escapeHtml(message.previousStatusEmoji)} ${escapeHtml(message.previousStatusLabel)}</span>
      <span style="color:${t.mutedForeground};"> → </span>
      <span style="font-weight:600;">${escapeHtml(message.newStatusEmoji)} ${escapeHtml(message.newStatusLabel)}</span>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:${t.mutedForeground};">${escapeHtml(message.timestamp)}</p>
    ${button}
  `.trim();

  const html = emailDocument({
    heading: "Foundry experiment update",
    preheader: `${message.newStatusLabel} · ${codeOrId}`,
    bodyHtml,
  });

  const text = [
    "Foundry experiment update",
    `Experiment: ${codeOrId}`,
    message.experimentName ? `Name: ${message.experimentName}` : null,
    `Status: ${message.previousStatusLabel} → ${message.newStatusLabel}`,
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
