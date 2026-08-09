import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

function constantTimeEqual(left: string, right: string) {
  const leftDigest = createHmac("sha256", "todd-bearer-compare")
    .update(left)
    .digest();
  const rightDigest = createHmac("sha256", "todd-bearer-compare")
    .update(right)
    .digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function cronAuthorization(
  expected: string | undefined,
  authorization: string | null,
): "misconfigured" | "unauthorized" | "authorized" {
  if (!expected?.trim()) return "misconfigured";
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return "unauthorized";
  return constantTimeEqual(expected, match[1])
    ? "authorized"
    : "unauthorized";
}

export function clientFingerprint(
  trustedClientIp: string | null,
  secret: string,
) {
  if (!secret) throw new Error("FINGERPRINT_SECRET is required.");
  const address = trustedClientIp?.trim() ?? "";
  if (!address || address.includes(",") || isIP(address) === 0) {
    throw new Error("A trusted client IP is required.");
  }
  return createHmac("sha256", secret).update(address).digest("hex");
}

export function isSameOriginRequest({
  origin,
  expectedOrigin,
}: {
  origin: string | null;
  expectedOrigin: string;
}) {
  if (!origin || !expectedOrigin) return false;
  try {
    const parsed = new URL(origin);
    return !parsed.username && !parsed.password && parsed.origin === expectedOrigin;
  } catch {
    return false;
  }
}
