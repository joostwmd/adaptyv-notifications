export function parseAllowedEmailDomains(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

export function isEmailFromAllowedDomain(email: string, allowedDomains: string[]): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) {
    return false;
  }
  const domain = email.slice(at + 1).toLowerCase();
  return allowedDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}
