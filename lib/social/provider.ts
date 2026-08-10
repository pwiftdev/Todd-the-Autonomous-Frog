import type { SocialProvider } from "@/lib/social/types";
import { MockSocialProvider } from "@/lib/social/mock";
import { XSocialProvider } from "@/lib/social/x";

export type { SocialProvider } from "@/lib/social/types";

export function createSocialProvider(): SocialProvider {
  const preferred = (process.env.SOCIAL_PROVIDER ?? "mock").toLowerCase();
  if (
    preferred === "x" &&
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_SECRET
  ) {
    return new XSocialProvider();
  }
  return new MockSocialProvider();
}

export const socialProvider: SocialProvider = createSocialProvider();
