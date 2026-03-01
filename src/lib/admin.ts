import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appAdmins } from "@/db/schema";

export async function getAdminUsers() {
  try {
    return await db
      .select({ userId: appAdmins.userId, createdAt: appAdmins.createdAt })
      .from(appAdmins);
  } catch {
    return [];
  }
}

export async function isAdminUser(userId: string | null | undefined) {
  if (!userId) {
    return false;
  }

  try {
    const [adminCount] = await db.select({ value: count() }).from(appAdmins);

    if (!adminCount || adminCount.value === 0) {
      return true;
    }

    const [adminRow] = await db
      .select({ userId: appAdmins.userId })
      .from(appAdmins)
      .where(eq(appAdmins.userId, userId))
      .limit(1);

    return Boolean(adminRow);
  } catch {
    return false;
  }
}
