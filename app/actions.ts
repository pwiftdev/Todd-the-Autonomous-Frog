"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  runDecisionCycle,
  runObservationCycle,
  rollbackLatestConfig,
} from "@/lib/autonomy";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import { suggestionSchema } from "@/lib/validation";
import {
  adminSessionValue,
  requireAdmin,
  verifyAdminSecret,
} from "@/lib/admin-auth";
import { runBrainTick } from "@/lib/worker/tick";

export type ActionState = { ok: boolean; message: string };

export async function submitSuggestion(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const headerStore = await headers();
    const fingerprint = createHash("sha256")
      .update(
        headerStore.get("x-forwarded-for") ??
          headerStore.get("user-agent") ??
          "unknown",
      )
      .digest("hex");
    assertRateLimit(fingerprint);
    const parsed = suggestionSchema.safeParse({
      text: formData.get("text"),
      category: formData.get("category"),
      displayName: formData.get("displayName"),
    });
    if (!parsed.success) {
      return {
        ok: false,
        message:
          parsed.error.issues[0]?.message ?? "Todd rejected the wording.",
      };
    }
    await prisma.$transaction(async (tx) => {
      const suggestion = await tx.suggestion.create({ data: parsed.data });
      await tx.outboxEvent.create({
        data: {
          type: "suggestion.created",
          payload: {
            suggestionId: suggestion.id,
            text: suggestion.text,
            category: suggestion.category,
            supportCount: suggestion.supportCount,
          },
        },
      });
    });
    revalidatePath("/");
    revalidatePath("/suggestions");
    return { ok: true, message: "Submitted. Todd owes you nothing." };
  } catch (error) {
    const rateLimited =
      error instanceof Error &&
      error.message.startsWith("Todd has heard enough");
    return {
      ok: false,
      message: rateLimited ? error.message : "Todd refused the paperwork.",
    };
  }
}

export async function supportSuggestion(id: string) {
  const headerStore = await headers();
  const fingerprint = createHash("sha256")
    .update(
      headerStore.get("x-forwarded-for") ??
        headerStore.get("user-agent") ??
        "unknown",
    )
    .digest("hex");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.suggestionSupport.create({
        data: { suggestionId: id, fingerprint },
      });
      const suggestion = await tx.suggestion.update({
        where: { id },
        data: { supportCount: { increment: 1 } },
      });
      await tx.outboxEvent.create({
        data: {
          type: "suggestion.supported",
          payload: {
            suggestionId: suggestion.id,
            supportCount: suggestion.supportCount,
          },
        },
      });
    });
  } catch {}
  revalidatePath("/");
  revalidatePath("/suggestions");
}

export async function adminLogin(formData: FormData) {
  const submitted = String(formData.get("secret") ?? "");
  const secret = process.env.ADMIN_SECRET;
  const headerStore = await headers();
  const fingerprint = createHash("sha256")
    .update(headerStore.get("x-forwarded-for") ?? "unknown")
    .digest("hex");
  try {
    assertRateLimit(`admin:${fingerprint}`, 8, 15 * 60 * 1000);
  } catch {
    redirect("/admin?error=rate");
  }
  if (!secret || !verifyAdminSecret(submitted)) redirect("/admin?error=1");
  (await cookies()).set("todd_admin", adminSessionValue(secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  redirect("/admin");
}

export async function toggleAutonomy() {
  await requireAdmin();
  const state = await prisma.toddState.findUniqueOrThrow({
    where: { id: "todd" },
  });
  await prisma.toddState.update({
    where: { id: "todd" },
    data: { autonomyPaused: !state.autonomyPaused },
  });
  revalidatePath("/admin");
}

export async function triggerDecision() {
  await requireAdmin();
  await runDecisionCycle();
  revalidatePath("/", "layout");
}

export async function triggerObservation() {
  await requireAdmin();
  await runObservationCycle();
  revalidatePath("/", "layout");
}

export async function triggerBrainTick() {
  await requireAdmin();
  await runBrainTick(`admin_${Date.now()}`);
  revalidatePath("/", "layout");
}

export async function rollbackConfig() {
  await requireAdmin();
  await rollbackLatestConfig();
  revalidatePath("/", "layout");
}
