import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminSession,
  verifyAdminPassword,
  verifyAdminSession,
} from "./admin-session";
import {
  clientFingerprint,
  cronAuthorization,
  isSameOriginRequest,
} from "./request";

const secret = "test-secret-that-is-long-enough";

test("admin session is signed, expires cryptographically and rejects tampering", () => {
  const token = createAdminSession(secret, {
    nowMs: 1_000,
    ttlMs: 5_000,
  });

  assert.equal(verifyAdminSession(token, secret, 5_999), true);
  assert.equal(verifyAdminSession(token, secret, 6_001), false);
  assert.equal(verifyAdminSession(`${token}x`, secret, 2_000), false);
  assert.equal(verifyAdminSession(token, `${secret}-rotated`, 2_000), false);
});

test("admin password comparison denies missing configuration", () => {
  assert.equal(verifyAdminPassword("anything", undefined), false);
  assert.equal(verifyAdminPassword(secret, secret), true);
  assert.equal(verifyAdminPassword(`${secret}x`, secret), false);
});

test("cron auth distinguishes server misconfiguration from bad credentials", () => {
  assert.equal(cronAuthorization(undefined, null), "misconfigured");
  assert.equal(cronAuthorization(secret, null), "unauthorized");
  assert.equal(cronAuthorization(secret, "Bearer wrong"), "unauthorized");
  assert.equal(cronAuthorization(secret, `Bearer ${secret}`), "authorized");
});

test("client fingerprint accepts exactly one trusted ingress address", () => {
  const fingerprint = clientFingerprint("203.0.113.10", secret);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(fingerprint.includes("203.0.113.10"), false);
  assert.throws(() => clientFingerprint(null, secret), /trusted client IP/i);
  assert.throws(
    () => clientFingerprint("198.51.100.77, 203.0.113.10", secret),
    /trusted client IP/i,
  );
});

test("same-origin validation rejects cross-origin and malformed origins", () => {
  assert.equal(
    isSameOriginRequest({
      origin: "https://todd.example",
      expectedOrigin: "https://todd.example",
    }),
    true,
  );
  assert.equal(
    isSameOriginRequest({
      origin: "https://evil.example",
      expectedOrigin: "https://todd.example",
    }),
    false,
  );
  assert.equal(
    isSameOriginRequest({
      origin: "not a url",
      expectedOrigin: "https://todd.example",
    }),
    false,
  );
  assert.equal(
    isSameOriginRequest({
      origin: "http://todd.example",
      expectedOrigin: "https://todd.example",
    }),
    false,
  );
  assert.equal(
    isSameOriginRequest({ origin: null, expectedOrigin: "https://todd.example" }),
    false,
  );
});
