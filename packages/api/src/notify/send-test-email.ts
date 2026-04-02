import { sendMail } from "@notify/nodemailer";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends a static test email to verify SMTP and the destination address.
 * No experiment or webhook payload data.
 */
export async function sendTestEmail(to: string, destinationName: string): Promise<void> {
  const name = escapeHtml(destinationName);
  const subject = "Test notification from Foundry Notify";

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:system-ui,sans-serif;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;">
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:18px;">Hello</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#333;">
          This is a test message for the destination <strong>${name}</strong>.
        </p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#555;">
          If you received this email, your notification destination is set up correctly.
        </p>
        <p style="margin:16px 0 0;font-size:13px;color:#888;">
          This is not tied to any experiment—it was sent from the Notify app.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

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
