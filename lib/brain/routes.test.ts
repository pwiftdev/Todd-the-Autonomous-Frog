import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { GET as brainState } from "@/app/api/brain/state/route";
import { GET as queueDecision } from "@/app/api/cron/decision/route";
import { GET as runWorker } from "@/app/api/cron/worker/route";
import { GET as liveness } from "@/app/api/health/live/route";
import { GET as readiness } from "@/app/api/health/ready/route";

const saved = {
  CRON_SECRET: process.env.CRON_SECRET,
  TODD_RUNTIME_MODE: process.env.TODD_RUNTIME_MODE,
  DATABASE_URL: process.env.DATABASE_URL,
};

test.after(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function request(path: string, authorization?: string) {
  return new NextRequest(`https://todd.example${path}`, {
    headers: authorization ? { authorization } : undefined,
  });
}

test("protected cron routes distinguish misconfiguration from bad credentials", async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await queueDecision(request("/api/cron/decision"))).status, 503);
  assert.equal((await runWorker(request("/api/cron/worker"))).status, 503);

  process.env.CRON_SECRET = "correct-secret";
  assert.equal(
    (await queueDecision(request("/api/cron/decision", "Bearer wrong"))).status,
    401,
  );
  assert.equal(
    (await runWorker(request("/api/cron/worker", "Bearer wrong"))).status,
    401,
  );
});

test("liveness stays independent from dependencies", async () => {
  const response = await liveness();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, status: "alive" });
});

test("readiness and brain state fail explicitly without persistent storage", async () => {
  process.env.TODD_RUNTIME_MODE = "demo";
  delete process.env.DATABASE_URL;

  assert.equal((await readiness()).status, 503);
  assert.equal((await brainState()).status, 503);
});
