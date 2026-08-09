import { cookies } from "next/headers";

import {
  createAdminSession,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/security/admin-session";

export function verifyAdminSecret(submitted: string) {
  return verifyAdminPassword(submitted, process.env.ADMIN_SECRET);
}

export async function isAdmin() {
  const session = (await cookies()).get("todd_admin")?.value;
  return verifyAdminSession(session, process.env.ADMIN_SECRET);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Admin access required.");
}

export const adminSessionValue = (secret: string) => createAdminSession(secret);
