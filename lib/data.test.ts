import assert from "node:assert/strict";
import test from "node:test";

import { dataProvenanceForMode, getToddData } from "./data";

test("only live runtime labels PostgreSQL-backed data as live", () => {
  assert.equal(dataProvenanceForMode("demo").synthetic, true);
  assert.equal(dataProvenanceForMode("test").synthetic, true);
  assert.deepEqual(dataProvenanceForMode("live"), {
    mode: "live",
    synthetic: false,
    label: "Live PostgreSQL data",
  });
});

test("fixture data is explicitly marked synthetic", async () => {
  const previousMode = process.env.TODD_RUNTIME_MODE;
  const previousDatabase = process.env.DATABASE_URL;
  process.env.TODD_RUNTIME_MODE = "demo";
  delete process.env.DATABASE_URL;
  try {
    const data = await getToddData();
    assert.deepEqual(data.provenance, {
      mode: "demo",
      synthetic: true,
      label: "Demo data — not live Todd activity",
    });
  } finally {
    if (previousMode === undefined) delete process.env.TODD_RUNTIME_MODE;
    else process.env.TODD_RUNTIME_MODE = previousMode;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabase;
  }
});
