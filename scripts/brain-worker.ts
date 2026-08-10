import { runBrainTick } from "../lib/worker/tick";

const intervalMs = Number(process.env.BRAIN_TICK_MS ?? "60000");

async function loop() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required for the brain worker.");
    process.exit(1);
  }
  console.log(`[todd-worker] starting; interval=${intervalMs}ms`);
  for (;;) {
    try {
      const result = await runBrainTick(`worker_${process.pid}_${Date.now()}`);
      console.log(`[todd-worker]`, JSON.stringify(result));
    } catch (error) {
      console.error(
        `[todd-worker] tick failed`,
        error instanceof Error ? error.message : error,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

loop();
