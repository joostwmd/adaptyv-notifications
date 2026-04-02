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

/**
 * Dark dashboard look — hex approximations of `@notify/ui` `.dark` semantic tokens.
 */
export const DASHBOARD_EMAIL_THEME = {
  /** Page / canvas (darker than card so the card reads clearly in Gmail etc.) */
  background: "#0c0c0f",
  card: "#141418",
  cardBorder: "#3f3f46",
  foreground: "#ececee",
  mutedForeground: "#9f9fa9",
  /** Outline badge stroke (muted-foreground / 40% feel) */
  pillBorder: "#52525b",
  pillIcon: "#a1a1aa",
  pillText: "#d4d4d8",
  codeBackground: "#18181b",
  codeBorder: "#27272a",
  primaryButtonBg: "#ececee",
  primaryButtonFg: "#18181b",
  radius: "12px",
  radiusPill: "8px",
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

/** Dark card layout aligned with the in-app dashboard (`.dark`). */
export function emailDocumentDashboard(opts: {
  heading: string;
  preheader?: string;
  /** Optional short prefix before the title (plain text; escaped unless `headerPrefixIsHtml`) */
  headerPrefix?: string;
  /** When true, `headerPrefix` is raw HTML (e.g. a short &lt;span&gt;). */
  headerPrefixIsHtml?: boolean;
  bodyHtml: string;
}): string {
  const t = DASHBOARD_EMAIL_THEME;
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : "";

  const prefix =
    opts.headerPrefix != null && opts.headerPrefix.length > 0
      ? opts.headerPrefixIsHtml === true
        ? opts.headerPrefix
        : escapeHtml(opts.headerPrefix)
      : "";

  const iconCell =
    prefix.length > 0
      ? `<td style="width:40px;vertical-align:middle;padding:0 10px 0 0;font-size:20px;line-height:1;">${prefix}</td>`
      : "";

  const bg = t.background;
  const cardBg = t.card;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" style="background-color:${bg};">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body bgcolor="${bg}" style="margin:0;padding:0;background-color:${bg};font-family:${t.fontFamily};-webkit-font-smoothing:antialiased;">
  ${pre}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${bg}" style="background-color:${bg};padding:32px 16px;">
    <tr>
      <td align="center" bgcolor="${bg}" style="background-color:${bg};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${cardBg}" style="max-width:560px;border:1px solid ${t.cardBorder};border-radius:${t.radius};background-color:${cardBg};">
          <tr>
            <td bgcolor="${cardBg}" style="padding:26px 26px 24px;background-color:${cardBg};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${iconCell}
                  <td style="vertical-align:middle;">
                    <h1 style="margin:0;font-size:18px;font-weight:600;line-height:1.35;color:${t.foreground};letter-spacing:-0.02em;">${escapeHtml(opts.heading)}</h1>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 22px;"><tr><td style="height:1px;background-color:${t.cardBorder};line-height:1px;font-size:1px;">&nbsp;</td></tr></table>
              ${opts.bodyHtml}
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;"><tr><td style="padding:16px 8px 0;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${t.mutedForeground};">Notify · Adaptyv Foundry</p>
        </td></tr></table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
