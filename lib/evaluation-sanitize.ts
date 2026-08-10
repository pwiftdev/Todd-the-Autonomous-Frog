import { allowedConfigValues } from "@/lib/site-config-allowlist";
import type { SiteConfigData } from "@/lib/types";
import type { Evaluation } from "@/lib/validation";

function validateConfigValue(key: keyof SiteConfigData, value: string | null) {
  const choices = allowedConfigValues[key];
  if (choices && (value === null || !choices.includes(value)))
    throw new Error(`Value is not allowed for ${key}`);
  if (
    ["heroTitle", "heroSubtitle", "ctaCopy", "statusText"].includes(key) &&
    !value
  )
    throw new Error(`${key} cannot be empty`);
}

/** Drop unsafe/invalid site actions so a bad accent can't kill the whole review. */
export function sanitizeEvaluationAction(evaluation: Evaluation): Evaluation {
  if (!evaluation.action) return evaluation;
  const { key, value } = evaluation.action.payload;
  try {
    validateConfigValue(key, value);
    return evaluation;
  } catch {
    return { ...evaluation, action: null };
  }
}

export { validateConfigValue };
