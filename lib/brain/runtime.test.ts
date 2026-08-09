import assert from "node:assert/strict";
import test from "node:test";

import {
  RuntimeConfigurationError,
  resolveRuntimeConfig,
} from "./runtime";

test("demo mode permits the deterministic provider without storage", () => {
  const config = resolveRuntimeConfig(
    { TODD_RUNTIME_MODE: "demo", AI_PROVIDER: "mock" },
    "development",
  );

  assert.equal(config.mode, "demo");
  assert.equal(config.aiProvider, "mock");
  assert.equal(config.databaseUrl, null);
});

test("live mode requires an explicit database and non-mock provider", () => {
  assert.throws(
    () =>
      resolveRuntimeConfig(
        { TODD_RUNTIME_MODE: "live", AI_PROVIDER: "openai" },
        "production",
      ),
    RuntimeConfigurationError,
  );
  assert.throws(
    () =>
      resolveRuntimeConfig(
        {
          TODD_RUNTIME_MODE: "live",
          DATABASE_URL: "postgresql://example.invalid/todd",
          AI_PROVIDER: "mock",
        },
        "production",
      ),
    /mock provider/i,
  );
});

test("live OpenAI mode validates all required provider settings", () => {
  const config = resolveRuntimeConfig(
    {
      TODD_RUNTIME_MODE: "live",
      DATABASE_URL: "postgresql://example.invalid/todd",
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-only",
      OPENAI_MODEL: "gpt-test",
      FINGERPRINT_SECRET: "fingerprint-secret",
      CLIENT_IP_HEADER: "x-vercel-forwarded-for",
      PUBLIC_ORIGIN: "https://todd.example",
      ADMIN_SECRET: "admin-secret",
      CRON_SECRET: "cron-secret",
    },
    "production",
  );

  assert.equal(config.mode, "live");
  assert.equal(config.aiProvider, "openai");
  assert.equal(config.aiModel, "gpt-test");
  assert.equal(config.fingerprintSecret, "fingerprint-secret");
  assert.equal(config.clientIpHeader, "x-vercel-forwarded-for");
  assert.equal(config.publicOrigin, "https://todd.example");
});

test("live mode requires ingress, origin, admin and cron contracts", () => {
  assert.throws(
    () =>
      resolveRuntimeConfig(
        {
          TODD_RUNTIME_MODE: "live",
          DATABASE_URL: "postgresql://example.invalid/todd",
          AI_PROVIDER: "openai",
          OPENAI_API_KEY: "test-only",
          OPENAI_MODEL: "gpt-test",
          FINGERPRINT_SECRET: "fingerprint-secret",
        },
        "production",
      ),
    /CLIENT_IP_HEADER|PUBLIC_ORIGIN|ADMIN_SECRET|CRON_SECRET/,
  );
});

test("live mode rejects plaintext and unapproved OpenAI endpoints", () => {
  const base = {
    TODD_RUNTIME_MODE: "live",
    DATABASE_URL: "postgresql://example.invalid/todd",
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-only",
    OPENAI_MODEL: "gpt-test",
    FINGERPRINT_SECRET: "fingerprint-secret",
    CLIENT_IP_HEADER: "x-vercel-forwarded-for",
    PUBLIC_ORIGIN: "https://todd.example",
    ADMIN_SECRET: "admin-secret",
    CRON_SECRET: "cron-secret",
  };
  assert.throws(
    () => resolveRuntimeConfig({ ...base, OPENAI_BASE_URL: "http://api.openai.com/v1" }, "production"),
    /HTTPS/i,
  );
  assert.throws(
    () => resolveRuntimeConfig({ ...base, OPENAI_BASE_URL: "https://example.invalid/v1" }, "production"),
    /custom|approved/i,
  );
});

test("live mode rejects a missing fingerprint secret", () => {
  assert.throws(
    () =>
      resolveRuntimeConfig(
        {
          TODD_RUNTIME_MODE: "live",
          DATABASE_URL: "postgresql://example.invalid/todd",
          AI_PROVIDER: "openai",
          OPENAI_API_KEY: "test-only",
          OPENAI_MODEL: "gpt-test",
        },
        "production",
      ),
    /FINGERPRINT_SECRET/,
  );
});

test("production refuses an implicit runtime mode", () => {
  assert.throws(
    () => resolveRuntimeConfig({}, "production"),
    /TODD_RUNTIME_MODE/i,
  );
});
