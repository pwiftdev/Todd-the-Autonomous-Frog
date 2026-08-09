type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export function assertRateLimit(
  key: string,
  limit = 5,
  windowMs = 60 * 60 * 1000,
) {
  const now = Date.now();
  if (store.size > 10_000) {
    for (const [storedKey, entry] of store)
      if (entry.resetAt < now) store.delete(storedKey);
  }
  const current = store.get(key);
  if (!current || current.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit)
    throw new Error("Todd has heard enough from this pond for now.");
  current.count += 1;
}
