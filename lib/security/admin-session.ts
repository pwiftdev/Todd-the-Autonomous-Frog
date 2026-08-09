import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

function digest(value: string) {
  return createHmac("sha256", "todd-constant-time-compare")
    .update(value)
    .digest();
}

function compare(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyAdminPassword(
  submitted: string,
  configured: string | undefined,
) {
  return Boolean(configured && compare(submitted, configured));
}

export function createAdminSession(
  secret: string,
  {
    nowMs = Date.now(),
    ttlMs = 8 * 60 * 60 * 1_000,
  }: { nowMs?: number; ttlMs?: number } = {},
) {
  if (!secret) throw new Error("ADMIN_SECRET is required.");
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1_000) {
    throw new Error("Admin session TTL must be at least one second.");
  }
  const expiresAt = nowMs + ttlMs;
  const payload = `v1.${expiresAt}.${randomBytes(12).toString("base64url")}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyAdminSession(
  token: string | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || nowMs > expiresAt) return false;
  const payload = parts.slice(0, 3).join(".");
  return compare(parts[3], signature(payload, secret));
}
