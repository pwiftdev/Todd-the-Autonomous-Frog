import type { SiteConfigData } from "@/lib/types";

export const allowedConfigValues: Partial<
  Record<keyof SiteConfigData, readonly string[]>
> = {
  theme: ["classic_swamp", "midnight_swamp", "misty_pond"],
  accent: ["lime", "amber", "mint"],
  frogMood: ["calm", "suspicious", "pleased", "plotting"],
  frogAccessory: ["none", "crown", "lily"],
};
