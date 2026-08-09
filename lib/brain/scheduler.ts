const FIVE_MINUTES_MS = 300_000;

export function cronIdempotencyKey(nowMs = Date.now()) {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error("Invalid scheduler timestamp.");
  }
  return `cron:decision:${Math.floor(nowMs / FIVE_MINUTES_MS)}`;
}
