type Environment = Record<string, string | undefined>;

export type RuntimeMode = "demo" | "live" | "test";
export type AiProviderName = "mock" | "openai";

export type RuntimeConfig = {
  mode: RuntimeMode;
  databaseUrl: string | null;
  aiProvider: AiProviderName;
  aiModel: string | null;
  openAiApiKey: string | null;
  openAiBaseUrl: string;
  fingerprintSecret: string;
  clientIpHeader: string;
  publicOrigin: string;
};

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

function required(env: Environment, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new RuntimeConfigurationError(`${key} is required.`);
  return value;
}

function resolvePublicOrigin(value: string) {
  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.origin !== value.replace(/\/$/, "")
    ) {
      throw new Error("invalid origin");
    }
    return parsed.origin;
  } catch {
    throw new RuntimeConfigurationError("PUBLIC_ORIGIN must be an exact HTTP(S) origin.");
  }
}

export function resolveRuntimeConfig(
  env: Environment,
  nodeEnv = env.NODE_ENV ?? "development",
): RuntimeConfig {
  const configuredMode = env.TODD_RUNTIME_MODE?.trim().toLowerCase();
  if (!configuredMode && nodeEnv === "production") {
    throw new RuntimeConfigurationError(
      "TODD_RUNTIME_MODE must be explicitly set in production.",
    );
  }
  const mode = (configuredMode ?? (nodeEnv === "test" ? "test" : "demo")) as
    | RuntimeMode
    | string;
  if (!(["demo", "live", "test"] as const).includes(mode as RuntimeMode)) {
    throw new RuntimeConfigurationError(
      "TODD_RUNTIME_MODE must be demo, live, or test.",
    );
  }

  const providerName = (env.AI_PROVIDER?.trim().toLowerCase() ?? "mock") as
    | AiProviderName
    | string;
  if (!(["mock", "openai"] as const).includes(providerName as AiProviderName)) {
    throw new RuntimeConfigurationError("AI_PROVIDER must be mock or openai.");
  }
  if (mode === "live" && providerName === "mock") {
    throw new RuntimeConfigurationError("Live mode cannot use the mock provider.");
  }

  const databaseUrl = env.DATABASE_URL?.trim() || null;
  if (mode === "live" && !databaseUrl) required(env, "DATABASE_URL");
  const fingerprintSecret =
    env.FINGERPRINT_SECRET?.trim() ||
    (mode === "live"
      ? required(env, "FINGERPRINT_SECRET")
      : "todd-demo-fingerprint-secret");
  const clientIpHeader =
    env.CLIENT_IP_HEADER?.trim().toLowerCase() ||
    (mode === "live" ? required(env, "CLIENT_IP_HEADER") : "x-forwarded-for");
  if (!/^[a-z0-9-]+$/.test(clientIpHeader)) {
    throw new RuntimeConfigurationError("CLIENT_IP_HEADER is invalid.");
  }
  const publicOrigin = resolvePublicOrigin(
    env.PUBLIC_ORIGIN?.trim() ||
      (mode === "live" ? required(env, "PUBLIC_ORIGIN") : "http://localhost:3000"),
  );
  if (mode === "live") {
    required(env, "ADMIN_SECRET");
    required(env, "CRON_SECRET");
  }

  const openAiApiKey = env.OPENAI_API_KEY?.trim() || null;
  const aiModel = env.OPENAI_MODEL?.trim() || null;
  if (providerName === "openai") {
    required(env, "OPENAI_API_KEY");
    required(env, "OPENAI_MODEL");
  }
  const openAiBaseUrl =
    env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ??
    "https://api.openai.com/v1";
  if (mode === "live") {
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(openAiBaseUrl);
    } catch {
      throw new RuntimeConfigurationError("OPENAI_BASE_URL must be a valid HTTPS URL.");
    }
    if (parsedBaseUrl.protocol !== "https:" || parsedBaseUrl.username || parsedBaseUrl.password) {
      throw new RuntimeConfigurationError(
        "OPENAI_BASE_URL must use HTTPS without credentials.",
      );
    }
    if (
      parsedBaseUrl.hostname !== "api.openai.com" &&
      env.OPENAI_ALLOW_CUSTOM_BASE_URL?.trim().toLowerCase() !== "true"
    ) {
      throw new RuntimeConfigurationError(
        "A custom OPENAI_BASE_URL requires OPENAI_ALLOW_CUSTOM_BASE_URL=true.",
      );
    }
  }

  return {
    mode: mode as RuntimeMode,
    databaseUrl,
    aiProvider: providerName as AiProviderName,
    aiModel,
    openAiApiKey,
    openAiBaseUrl,
    fingerprintSecret,
    clientIpHeader,
    publicOrigin,
  };
}

export function getRuntimeConfig() {
  return resolveRuntimeConfig(process.env, process.env.NODE_ENV);
}
