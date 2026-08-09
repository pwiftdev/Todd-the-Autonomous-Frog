import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.toddState.upsert({
    where: { id: "todd" },
    update: {},
    create: {
      id: "todd",
      createdAt: new Date(Date.now() - 14 * 86400000),
      nextDecisionAt: new Date(Date.now() + 222000),
    },
  });
  await prisma.personality.upsert({
    where: { id: "personality" },
    update: {},
    create: {
      id: "personality",
      curiosity: 82,
      stubbornness: 76,
      chaos: 48,
      confidence: 86,
      friendliness: 58,
    },
  });
  await prisma.socialStyle.upsert({
    where: { id: "social-style" },
    update: {},
    create: {
      id: "social-style",
      maxLength: 180,
      emojiFrequency: "low",
      tone: "dry",
      lowercase: false,
      replyFrequency: "medium",
    },
  });
  if ((await prisma.siteConfig.count()) === 0) {
    await prisma.siteConfig.create({
      data: {
        version: 1,
        isActive: true,
        theme: "classic_swamp",
        accent: "lime",
        heroTitle: "TODD",
        heroSubtitle: "An autonomous frog shaped by the internet.",
        ctaCopy: "Suggest something to Todd",
        announcement: "DAY 14 · AUTONOMY ONLINE",
        statusText: "Thinking",
        frogMood: "suspicious",
        frogAccessory: "crown",
        enabledSections: [
          "thoughts",
          "suggestions",
          "decisions",
          "changelog",
          "social",
        ],
      },
    });
  }
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
  if ((await prisma.thought.count()) === 0)
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
  if ((await prisma.socialPost.count()) === 0)
    await prisma.socialPost.createMany({
      data: [
        {
          content: "1,204 humans asked me to wear a crown. Fine.",
          externalId: "mock_seed_1",
        },
        {
          content: "The community wants democracy. Rejected.",
          externalId: "mock_seed_2",
          createdAt: new Date(Date.now() - 980 * 60000),
        },
      ],
    });
  if ((await prisma.memory.count()) === 0)
    await prisma.memory.createMany({
      data: [
        {
          type: "preference",
          content: "Todd prefers short public posts.",
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

main().finally(() => prisma.$disconnect());
