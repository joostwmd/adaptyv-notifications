/**
 * Hex fallbacks aligned with `@notify/ui` light semantic tokens (`globals.css` :root).
 * Email clients do not support CSS variables or oklch reliably.
 */
export const EMAIL_THEME = {
  background: "#f4f4f5",
  foreground: "#18181b",
  card: "#ffffff",
  mutedForeground: "#71717a",
  border: "#e4e4e7",
  primary: "#27272a",
  primaryForeground: "#fafafa",
  radius: "12px",
  radiusButton: "8px",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailDocument(opts: {
  heading: string;
  preheader?: string;
  /** Safe HTML fragments (user data must be escaped by caller). */
  bodyHtml: string;
}): string {
  const t = EMAIL_THEME;
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${t.background};font-family:${t.fontFamily};-webkit-font-smoothing:antialiased;">
  ${pre}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${t.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border:1px solid ${t.border};border-radius:${t.radius};background-color:${t.card};box-shadow:0 1px 2px rgba(24,24,27,0.06);">
          <tr>
            <td style="padding:28px 28px 26px;">
              <h1 style="margin:0 0 22px;font-size:18px;font-weight:600;line-height:1.35;color:${t.foreground};letter-spacing:-0.02em;">${escapeHtml(opts.heading)}</h1>
              ${opts.bodyHtml}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${t.mutedForeground};max-width:560px;">
          Notify · Adaptyv Foundry
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
