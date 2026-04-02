/**
 * Dev helper: POST synthetic Foundry-style webhook payloads to the local server.
 *
 * Usage:
 *   pnpm webhook:test
 *   pnpm webhook:test -- --from in_production --to done
 *   pnpm webhook:test -- --lifecycle
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, "../apps/server/.env") });

const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;
const BASE_URL = process.env.WEBHOOK_TEST_URL ?? "http://localhost:3000";

const STATUSES = [
  "draft",
  "waiting_for_confirmation",
  "quote_sent",
  "waiting_for_materials",
  "in_queue",
  "in_production",
  "data_analysis",
  "in_review",
  "done",
] as const;

type Status = (typeof STATUSES)[number];

function parseArgs() {
  const argv = process.argv.slice(2);
  let from: Status = "in_production";
  let to: Status = "done";
  let lifecycle = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lifecycle") lifecycle = true;
    else if (a === "--from" && argv[i + 1]) {
      from = argv[++i] as Status;
    } else if (a === "--to" && argv[i + 1]) {
      to = argv[++i] as Status;
    }
  }
  return { from, to, lifecycle };
}

function buildPayload(previous_status: Status, new_status: Status, experimentId: string) {
  const code = `TEST-${experimentId.slice(0, 8)}`;
  const now = new Date().toISOString();
  return {
    experiment_id: experimentId,
    experiment_code: code,
    previous_status,
    new_status,
    timestamp: now,
    experiment: {
      id: experimentId,
      code,
      name: "Synthetic binding screen",
      status: new_status,
      experiment_type: "screening",
      results_status: "none",
      experiment_url: `https://foundry.adaptyvbio.com/experiments/${experimentId}`,
      created_at: now,
    },
  };
}

async function post(payload: unknown) {
  const url = new URL("/webhook", BASE_URL);
  url.searchParams.set("token", WEBHOOK_TOKEN!);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!WEBHOOK_TOKEN) {
    console.error("Missing WEBHOOK_TOKEN in apps/server/.env");
    process.exit(1);
  }

  const { from, to, lifecycle } = parseArgs();
  const experimentId = crypto.randomUUID();

  if (lifecycle) {
    console.log(`Lifecycle run for experiment ${experimentId} → ${BASE_URL}/webhook`);
    for (let i = 0; i < STATUSES.length - 1; i++) {
      const prev = STATUSES[i]!;
      const next = STATUSES[i + 1]!;
      const body = buildPayload(prev, next, experimentId);
      await post(body);
      console.log(`  ${prev} → ${next}: ok`);
      await sleep(1000);
    }
    return;
  }

  const body = buildPayload(from, to, experimentId);
  await post(body);
  console.log(`Posted ${from} → ${to} for ${experimentId}: ok`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
