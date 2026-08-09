import assert from "node:assert/strict";
import test from "node:test";

import { cronIdempotencyKey } from "./scheduler";

test("cron duplicate deliveries share one five-minute idempotency key", () => {
  const atThree = Date.parse("2026-08-09T12:03:00.000Z");
  const atFour = Date.parse("2026-08-09T12:04:59.999Z");
  const atFive = Date.parse("2026-08-09T12:05:00.000Z");

  assert.equal(cronIdempotencyKey(atThree), cronIdempotencyKey(atFour));
  assert.notEqual(cronIdempotencyKey(atFour), cronIdempotencyKey(atFive));
  assert.match(cronIdempotencyKey(atThree), /^cron:decision:\d+$/);
});
