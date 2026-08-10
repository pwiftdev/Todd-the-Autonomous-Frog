export type AppMode = "demo" | "live";

export function getAppMode(): AppMode {
  const mode = (process.env.APP_MODE ?? "demo").toLowerCase();
  return mode === "live" ? "live" : "demo";
}

export function isLiveMode() {
  return getAppMode() === "live";
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Live mode must never silently fall back to fabricated demo history. */
export function assertLiveDatabase() {
  if (isLiveMode() && !hasDatabase()) {
    throw new Error(
      "APP_MODE=live requires DATABASE_URL. Refusing to load demo fallback data.",
    );
  }
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
}

export function getDailyTokenBudget() {
  const raw = Number(process.env.OPENAI_DAILY_TOKEN_BUDGET ?? "500000");
  return Number.isFinite(raw) && raw > 0 ? raw : 500000;
}

export function getMaxSocialPostsPerDay() {
  const raw = Number(process.env.MAX_SOCIAL_POSTS_PER_DAY ?? "8");
  return Number.isFinite(raw) && raw > 0 ? raw : 8;
}
