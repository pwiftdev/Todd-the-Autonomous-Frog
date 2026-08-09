"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  enqueueDecisionCycle,
  rollbackLatestConfig,
} from "@/lib/autonomy";
import {
  adminSessionValue,
  requireAdmin,
  verifyAdminSecret,
} from "@/lib/admin-auth";
import { getRuntimeConfig } from "@/lib/brain/runtime";
import { prisma } from "@/lib/prisma";
import { consumeSharedRateLimit } from "@/lib/security/rate-limit";
import {
  clientFingerprint,
  isSameOriginRequest,
} from "@/lib/security/request";
import { submitVisitorSuggestion } from "@/lib/suggestions";

export type ActionState = { ok: boolean; message: string };

async function mutationIdentity() {
  const requestHeaders = await headers();
  const runtime = getRuntimeConfig();
  if (
    !isSameOriginRequest({
      origin: requestHeaders.get("origin"),
      expectedOrigin: runtime.publicOrigin,
    })
  ) {
    throw new Error("Cross-origin mutation rejected.");
  }
  return clientFingerprint(
    requestHeaders.get(runtime.clientIpHeader),
    runtime.fingerprintSecret,
  );
}

export async function submitSuggestion(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const fingerprint = await mutationIdentity();
    const result = await submitVisitorSuggestion(prisma, {
      fingerprint,
      text: formData.get("text"),
      category: formData.get("category"),
      displayName: formData.get("displayName"),
    });
    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/suggestions");
    }
    return result;
  } catch {
    return { ok: false, message: "Todd's suggestion desk is unavailable." };
  }
}

export async function supportSuggestion(id: string) {
  const fingerprint = await mutationIdentity();
  if (!id || id.length > 64) return;
  const rate = await consumeSharedRateLimit(prisma, {
    key: `support:${fingerprint}`,
    limit: 30,
    windowMs: 60 * 60 * 1_000,
  });
  if (!rate.allowed) return;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.suggestionSupport.create({
        data: { suggestionId: id, fingerprint },
      });
      await tx.suggestion.update({
        where: { id },
        data: { supportCount: { increment: 1 } },
      });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }
  revalidatePath("/");
  revalidatePath("/suggestions");
}

export async function adminLogin(formData: FormData) {
  const fingerprint = await mutationIdentity();
  const rate = await consumeSharedRateLimit(prisma, {
    key: `admin-login:${fingerprint}`,
    limit: 8,
    windowMs: 15 * 60 * 1_000,
  });
  if (!rate.allowed) redirect("/admin?error=rate");

  const submitted = String(formData.get("secret") ?? "");
  const secret = process.env.ADMIN_SECRET;
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
  await mutationIdentity();
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
  await mutationIdentity();
  await requireAdmin();
  await enqueueDecisionCycle({
    idempotencyKey: `admin:decision:${randomUUID()}`,
    trigger: "ADMIN",
  });
  revalidatePath("/admin");
}

export async function rollbackConfig() {
  await mutationIdentity();
  await requireAdmin();
  await rollbackLatestConfig();
  revalidatePath("/", "layout");
}
