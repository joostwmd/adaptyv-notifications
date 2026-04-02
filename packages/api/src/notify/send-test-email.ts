import { sendMail } from "@notify/nodemailer";
import { DASHBOARD_EMAIL_THEME, emailDocumentDashboard, escapeHtml } from "@notify/nodemailer/email-html";

/**
 * Sends a static test email to verify SMTP and the destination address.
 * No experiment or webhook payload data.
 */
export async function sendTestEmail(to: string, destinationName: string): Promise<void> {
  const t = DASHBOARD_EMAIL_THEME;
  const subject = "Test notification from Foundry Notify";
  const safeName = escapeHtml(destinationName);

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${t.foreground};">
      This is a test message for the destination <strong style="font-weight:600;">${safeName}</strong>.
    </p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:${t.mutedForeground};">
      If you received this email, your notification destination is set up correctly.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:${t.mutedForeground};">
      This is not tied to any experiment—it was sent from the Notify app.
    </p>
  `.trim();

  const html = emailDocumentDashboard({
    heading: "Hello",
    preheader: `Test · ${destinationName}`,
    bodyHtml,
  });

  const text = [
    "Hello",
    "",
    `This is a test message for the destination "${destinationName}".`,
    "",
    "If you received this email, your notification destination is set up correctly.",
    "",
    "This is not tied to any experiment—it was sent from the Notify app.",
  ].join("\n");

  await sendMail({
    to,
    subject,
    html,
    text,
  });
}
