import { statusMeta, type ExperimentStatus } from "@notify/shared/status-meta";

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
  const title = opts.experimentName?.trim()
    ? opts.experimentName
    : opts.experimentCodeOrId;
  const lines = [
    `*${prevLabel}* → *${nextLabel}*`,
    `_${opts.timestamp}_`,
  ];
  if (opts.experimentUrl) {
    lines.push(`<${opts.experimentUrl}|View in Foundry>`);
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title,
          text: lines.join("\n"),
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
  const res = await fetch(webhookUrl, {
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
