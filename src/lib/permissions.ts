import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { chamberRoles } from "@/db/schema";

export const staffRoles = ["evaluator", "chair", "clerk"] as const;

export type StaffRole = (typeof staffRoles)[number];

export async function getUserRoleForChamber(
  userId: string,
  chamberId: string,
): Promise<StaffRole | null> {
  try {
    const [roleRow] = await db
      .select({ role: chamberRoles.role })
      .from(chamberRoles)
      .where(
        and(
          eq(chamberRoles.userId, userId),
          eq(chamberRoles.chamberId, chamberId),
          inArray(chamberRoles.role, [...staffRoles]),
        ),
      )
      .limit(1);

    if (!roleRow) {
      return null;
    }

    return roleRow.role as StaffRole;
  } catch {
    return null;
  }
}

export async function canUpdateChamber(userId: string, chamberId: string) {
  const role = await getUserRoleForChamber(userId, chamberId);
  return role !== null;
}
