import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const compare = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

export function verifyAdminSecret(submitted: string) {
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret && compare(submitted, secret));
}

export async function isAdmin() {
  const secret = process.env.ADMIN_SECRET;
  const session = (await cookies()).get("todd_admin")?.value;
  return Boolean(
    secret &&
    session &&
    compare(session, createHash("sha256").update(secret).digest("hex")),
  );
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Admin access required.");
}

export const adminSessionValue = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");
