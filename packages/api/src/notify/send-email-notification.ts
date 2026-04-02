import { sendMail } from "@notify/nodemailer";

import type { NotificationMessage } from "./build-message";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmailNotification(
  to: string,
  message: NotificationMessage,
): Promise<void> {
  const codeOrId = message.experimentCode ?? message.experimentId;
  const subject = `${message.newStatusEmoji} Experiment ${codeOrId}: ${message.newStatusLabel}`;

  const title = escapeHtml(codeOrId);
  const nameLine =
    message.experimentName != null && message.experimentName.length > 0
      ? `<p style="margin:0 0 12px;color:#555;font-size:14px;">${escapeHtml(message.experimentName)}</p>`
      : "";

  const transitionHtml = `
    <p style="margin:0 0 8px;font-size:16px;line-height:1.5;">
      <strong>${escapeHtml(message.previousStatusEmoji)} ${escapeHtml(message.previousStatusLabel)}</strong>
      <span style="color:#888;"> → </span>
      <strong>${escapeHtml(message.newStatusEmoji)} ${escapeHtml(message.newStatusLabel)}</strong>
    </p>`;

  const timeHtml = `<p style="margin:0 0 16px;color:#888;font-size:13px;">${escapeHtml(message.timestamp)}</p>`;

  const button =
    message.experimentUrl != null && message.experimentUrl.length > 0
      ? `<p style="margin:0;">
          <a href="${escapeHtml(message.experimentUrl)}"
             style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;font-size:14px;border-radius:4px;">
            View in Foundry
          </a>
        </p>`
      : "";

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:system-ui,sans-serif;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;">
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 8px;font-size:18px;">Foundry experiment update</h1>
        <p style="margin:0 0 4px;font-size:14px;color:#333;"><strong>Experiment</strong></p>
        <p style="margin:0 0 12px;font-family:ui-monospace,monospace;font-size:15px;">${title}</p>
        ${nameLine}
        <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Status</strong></p>
        ${transitionHtml}
        ${timeHtml}
        ${button}
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

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
