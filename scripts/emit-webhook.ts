/**
 * Dev helper: POST synthetic Foundry-style webhook payloads to the local server.
 *
 * Usage:
 *   pnpm webhook:test                    # one random transition (default)
 *   pnpm webhook:test -- --count 5       # five random transitions (same experiment)
 *   pnpm webhook:test -- --delay-ms 500  # delay between posts when count > 1
 *   pnpm webhook:test -- --from in_production --to done
 *   pnpm webhook:test -- --lifecycle     # full ordered path to done
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(__dirname, "../apps/server/.env") });

const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;
const BASE_URL = process.env.WEBHOOK_TEST_URL ?? "http://localhost:3000";

/** Ordered path for --lifecycle (happy path, no canceled). */
const LIFECYCLE_STATUSES = [
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

/** All API statuses (for --random). */
const ALL_STATUSES = [
  ...LIFECYCLE_STATUSES,
  "canceled",
] as const;

type Status = (typeof ALL_STATUSES)[number];

function parseArgs() {
  const argv = process.argv.slice(2);
  let from: Status = "in_production";
  let to: Status = "done";
  let lifecycle = false;
  let explicitFromTo = false;
  let count = 1;
  let delayMs = 1000;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lifecycle") lifecycle = true;
    else if (a === "--count" && argv[i + 1]) {
      count = Math.max(1, Number.parseInt(argv[++i]!, 10) || 1);
    } else if (a === "--delay-ms" && argv[i + 1]) {
      delayMs = Math.max(0, Number.parseInt(argv[++i]!, 10) || 0);
    } else if (a === "--from" && argv[i + 1]) {
      from = argv[++i] as Status;
      explicitFromTo = true;
    } else if (a === "--to" && argv[i + 1]) {
      to = argv[++i] as Status;
      explicitFromTo = true;
    }
  }

  const random = !lifecycle && !explicitFromTo;
  return { from, to, lifecycle, random, count, delayMs };
}

function randomStatus(): Status {
  const i = Math.floor(Math.random() * ALL_STATUSES.length);
  return ALL_STATUSES[i]!;
}

function randomDistinctPair(): { from: Status; to: Status } {
  const prev = randomStatus();
  let next = randomStatus();
  let guard = 0;
  while (next === prev && guard++ < 50) {
    next = randomStatus();
  }
  if (next === prev) {
    const idx = ALL_STATUSES.indexOf(prev);
    next = ALL_STATUSES[(idx + 1) % ALL_STATUSES.length]!;
  }
  return { from: prev, to: next };
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

  const { from, to, lifecycle, random, count, delayMs } = parseArgs();
  const experimentId = crypto.randomUUID();

  if (lifecycle) {
    console.log(`Lifecycle run for experiment ${experimentId} → ${BASE_URL}/webhook`);
    for (let i = 0; i < LIFECYCLE_STATUSES.length - 1; i++) {
      const prev = LIFECYCLE_STATUSES[i]!;
      const next = LIFECYCLE_STATUSES[i + 1]!;
      const body = buildPayload(prev, next, experimentId);
      await post(body);
      console.log(`  ${prev} → ${next}: ok`);
      await sleep(1000);
    }
    return;
  }

  if (random) {
    console.log(
      `${count} random transition(s) (same experiment ${experimentId}) → ${BASE_URL}/webhook`,
    );
    for (let n = 0; n < count; n++) {
      const pair = randomDistinctPair();
      const body = buildPayload(pair.from, pair.to, experimentId);
      await post(body);
      console.log(`  [${n + 1}/${count}] ${pair.from} → ${pair.to}: ok`);
      if (n < count - 1 && delayMs > 0) await sleep(delayMs);
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
