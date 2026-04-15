import { statusMeta, type ExperimentStatus } from "@notify/shared/status-meta";

/** Avoid hanging until the edge proxy returns 502 (Slack or DNS issues). */
const SLACK_FETCH_TIMEOUT_MS = 15_000;

function slackFetch(url: string, init: Omit<RequestInit, "signal">): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(SLACK_FETCH_TIMEOUT_MS),
  });
}

/** Slack mrkdwn-sensitive characters in user-provided strings (avoid broken formatting). */
function slackEscapePlain(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatHumanTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function postSlackExperimentUpdate(
  webhookUrl: string,
  opts: {
    experimentCodeOrId: string;
    experimentName: string | null;
    previousStatus: ExperimentStatus;
    newStatus: ExperimentStatus;
    experimentUrl: string | null;
    timestamp: string;
  },
): Promise<void> {
  const prevLabel = statusMeta[opts.previousStatus].label;
  const nextLabel = statusMeta[opts.newStatus].label;
  const color = statusMeta[opts.newStatus].slackColor.replace(/^#/, "");
  const idLine = `*ID:* \`${slackEscapePlain(opts.experimentCodeOrId)}\``;
  const nameRaw = opts.experimentName?.trim();
  const nameLine = nameRaw
    ? `*Name:* ${slackEscapePlain(nameRaw)}`
    : "*Name:* —";
  const statusLine = `*Status:* ${slackEscapePlain(prevLabel)} → ${slackEscapePlain(nextLabel)}`;
  const whenLine = `*When:* ${slackEscapePlain(formatHumanTime(opts.timestamp))}`;
  const linkLine = opts.experimentUrl
    ? `<${opts.experimentUrl}|View in Foundry>`
    : null;

  const text = [idLine, nameLine, statusLine, whenLine, linkLine].filter(Boolean).join("\n");

  const res = await slackFetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: "Experiment status updated",
          text,
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Slack webhook HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
}

export async function postSlackTest(webhookUrl: string): Promise<void> {
  const res = await slackFetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Foundry Notify (headless) — test message. If you see this, Slack webhooks are configured correctly.",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Slack webhook HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
}
