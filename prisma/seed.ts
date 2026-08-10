import { PrismaClient } from "@prisma/client";
import {
  TODD_BIRTH_THOUGHT,
  TODD_COIN_MEMORY,
  TODD_GENESIS_TRAITS,
  TODD_IDENTITY_MEMORY,
  TODD_SOCIAL_STYLE,
} from "../lib/todd-personality";

const prisma = new PrismaClient();

const foundation = {
  personality: {
    id: "personality" as const,
    ...TODD_GENESIS_TRAITS,
  },
  socialStyle: {
    id: "social-style" as const,
    ...TODD_SOCIAL_STYLE,
  },
  siteConfig: {
    version: 1,
    isActive: true,
    theme: "classic_swamp",
    accent: "lime",
    heroTitle: "TODD",
    heroSubtitle: "an autonomous frog shaped by the internet.",
    ctaCopy: "suggest something to todd",
    announcement: "DAY 0 · BIRTH",
    statusText: "awake",
    frogMood: "suspicious",
    frogAccessory: "none",
    enabledSections: [
      "thoughts",
      "suggestions",
      "decisions",
      "changelog",
    ],
  },
};

async function ensureToddCoinMemory() {
  const existing = await prisma.memory.findFirst({
    where: { content: { contains: "pump.fun" } },
  });
  if (existing) return;
  await prisma.memory.create({
    data: {
      type: "identity",
      content: TODD_COIN_MEMORY,
      importance: 95,
    },
  });
}

export async function seedFoundation(options?: {
  createdAt?: Date;
  announcement?: string;
  accessory?: string;
}) {
  await prisma.toddState.upsert({
    where: { id: "todd" },
    update: {},
    create: {
      id: "todd",
      createdAt: options?.createdAt ?? new Date(),
      nextDecisionAt: new Date(Date.now() + 60_000),
      currentStatus: "Awake",
    },
  });
  await prisma.personality.upsert({
    where: { id: "personality" },
    update: { ...TODD_GENESIS_TRAITS },
    create: foundation.personality,
  });
  await prisma.socialStyle.upsert({
    where: { id: "social-style" },
    update: { ...TODD_SOCIAL_STYLE },
    create: foundation.socialStyle,
  });
  if ((await prisma.siteConfig.count()) === 0) {
    await prisma.siteConfig.create({
      data: {
        ...foundation.siteConfig,
        announcement:
          options?.announcement ?? foundation.siteConfig.announcement,
        frogAccessory:
          options?.accessory ?? foundation.siteConfig.frogAccessory,
      },
    });
  }
}

export async function seedGenesis() {
  await seedFoundation({
    createdAt: new Date(),
    announcement: "DAY 0 · BIRTH",
    accessory: "none",
  });

  if ((await prisma.thought.count()) === 0) {
    const thought = await prisma.thought.create({
      data: {
        content: TODD_BIRTH_THOUGHT,
        eventType: "birth",
      },
    });
    if ((await prisma.toddActivity.count()) === 0) {
      await prisma.toddActivity.create({
        data: {
          activityId: "deep_thought",
          room: "living",
          label: "Thinking on the rug",
          reason: TODD_BIRTH_THOUGHT,
          thoughtId: thought.id,
          status: "ACTIVE",
          endAt: new Date(Date.now() + 10 * 60_000),
        },
      });
    }
  }

  if ((await prisma.memory.count()) === 0) {
    await prisma.memory.create({
      data: {
        type: "identity",
        content: TODD_IDENTITY_MEMORY,
        importance: 100,
      },
    });
  }

  await ensureToddCoinMemory();

  await prisma.auditLog.create({
    data: {
      event: "GENESIS_SEEDED",
      actor: "system",
      metadata: { mode: "genesis" },
    },
  });
}

export async function seedDemo() {
  await seedFoundation({
    createdAt: new Date(Date.now() - 14 * 86400000),
    announcement: "DAY 14 · AUTONOMY ONLINE",
    accessory: "crown",
  });

  if ((await prisma.suggestion.count()) === 0) {
    const crown = await prisma.suggestion.create({
      data: {
        text: "Give yourself a crown.",
        category: "APPEARANCE",
        displayName: "froglover",
        status: "IMPLEMENTED",
        supportCount: 1204,
      },
    });
    const comic = await prisma.suggestion.create({
      data: {
        text: "Change the site to Comic Sans.",
        category: "WEBSITE",
        displayName: "fontcriminal",
        status: "REJECTED",
        supportCount: 91,
      },
    });
    await prisma.suggestion.createMany({
      data: [
        {
          text: "Make the website darker.",
          category: "WEBSITE",
          displayName: "mossboss",
          status: "PENDING",
          supportCount: 847,
        },
        {
          text: "Call your supporters tadpoles.",
          category: "PERSONALITY",
          displayName: "pondscum",
          status: "IMPLEMENTED",
          supportCount: 612,
        },
        {
          text: "Add weather to the pond.",
          category: "FEATURE",
          displayName: "rainfrog",
          status: "PENDING",
          supportCount: 284,
        },
      ],
    });
    await prisma.decision.createMany({
      data: [
        {
          suggestionId: crown.id,
          decision: "ACCEPT",
          confidence: 0.96,
          reasoningPublic: "I see no legitimate argument against this.",
          rawResponse: { source: "seed" },
        },
        {
          suggestionId: comic.id,
          decision: "REJECT",
          confidence: 0.99,
          reasoningPublic: "No.",
          rawResponse: { source: "seed" },
        },
      ],
    });
    await prisma.action.create({
      data: {
        suggestionId: crown.id,
        type: "frogAccessory_update",
        previousValue: "none",
        newValue: "crown",
        reasoning: "I see no legitimate argument against this.",
      },
    });
  }

  if ((await prisma.thought.count()) === 0) {
    await prisma.thought.createMany({
      data: [
        {
          content:
            "The humans appear unusually interested in changing my background color.",
          eventType: "thinking",
        },
        {
          content: "847 votes is pressure. It is not authority.",
          eventType: "observation",
          createdAt: new Date(Date.now() - 18 * 60000),
        },
        {
          content: "I have inspected the crown. It remains excellent.",
          eventType: "website_change",
          createdAt: new Date(Date.now() - 65 * 60000),
        },
      ],
    });
  }

  if ((await prisma.memory.count()) === 0) {
    await prisma.memory.createMany({
      data: [
        {
          type: "preference",
          content: "Todd prefers short thoughts and weird pond vibes.",
          importance: 80,
        },
        {
          type: "community",
          content: "The community enjoys when Todd argues with suggestions.",
          importance: 70,
        },
        {
          type: "website",
          content: "Todd accepted a crown after 1,204 humans supported it.",
          importance: 85,
        },
      ],
    });
  }

  if ((await prisma.toddActivity.count()) === 0) {
    await prisma.toddActivity.create({
      data: {
        activityId: "review_suggestions",
        room: "office",
        label: "Reviewing suggestions",
        reason: "Demo seed activity",
        status: "ACTIVE",
        endAt: new Date(Date.now() + 15 * 60_000),
      },
    });
  }

  await ensureToddCoinMemory();
}

async function main() {
  // Live always boots from genesis. Demo history requires an explicit SEED_MODE=demo.
  const seedMode = (process.env.SEED_MODE ?? "").toLowerCase();
  const appMode = (process.env.APP_MODE ?? "demo").toLowerCase();
  const useGenesis =
    seedMode === "genesis" ||
    seedMode === "live" ||
    (seedMode === "" && appMode === "live");

  if (useGenesis) {
    await seedGenesis();
    console.log("Seeded genesis / Day 0 Todd.");
    return;
  }

  if (seedMode === "demo" || appMode === "demo") {
    await seedDemo();
    console.log("Seeded demo Todd history.");
    return;
  }

  await seedGenesis();
  console.log("Seeded genesis / Day 0 Todd (safe default).");
}

main().finally(() => prisma.$disconnect());
