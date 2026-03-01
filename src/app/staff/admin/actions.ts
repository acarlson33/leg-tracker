"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { revalidateTag } from "next/cache";
import { appAdmins, chamberRoles, chambers, chamberState } from "@/db/schema";
import { getOrCreateChamberRecordBySlug } from "@/lib/chamber-data";
import { isAdminUser } from "@/lib/admin";
import { staffRoles } from "@/lib/permissions";

function buildRedirectPath(message: string, error?: boolean) {
  const params = new URLSearchParams();
  params.set("message", message);

  if (error) {
    params.set("error", "1");
  }

  return `/staff/admin?${params.toString()}`;
}

function isValidRole(value: string) {
  return staffRoles.includes(value as (typeof staffRoles)[number]);
}

function normalizeChamberBody(value: string): "House" | "Senate" | null {
  if (value === "House" || value === "Senate") {
    return value;
  }

  return null;
}

function slugifyChamberName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function createChamberAction(formData: FormData) {
  const { userId } = await auth();
  const actingUserId = userId;

  if (!actingUserId) {
    redirect(buildRedirectPath("Sign in is required.", true));
  }

  if (!(await isAdminUser(actingUserId))) {
    redirect(buildRedirectPath("Admin access required.", true));
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const body = normalizeChamberBody(String(formData.get("body") ?? "").trim());

  if (!name || !body) {
    redirect(buildRedirectPath("Chamber name and body are required.", true));
  }

  const slug = slugifyChamberName(slugInput || name);

  if (!slug) {
    redirect(buildRedirectPath("Enter a valid chamber name or slug.", true));
  }

  if (slug.length > 120) {
    redirect(buildRedirectPath("Chamber slug must be 120 characters or less.", true));
  }

  if (name.length > 120) {
    redirect(buildRedirectPath("Chamber name must be 120 characters or less.", true));
  }

  const existing = await getOrCreateChamberRecordBySlug(slug);
  if (existing) {
    redirect(buildRedirectPath("A chamber with that slug already exists.", true));
  }

  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(chambers).values({
        id: slug,
        slug,
        name,
        body,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(chamberState).values({
        chamberId: slug,
        state: "No Active Bill",
        updatedByUserId: actingUserId,
        updatedAt: now,
      });
    });
  } catch {
    redirect(
      buildRedirectPath(
        "Unable to create chamber. Confirm migrations are applied.",
        true,
      ),
    );
  }

  revalidatePath("/");
  revalidatePath("/staff/admin");
  revalidatePath(`/chamber/${slug}`);
  revalidatePath(`/staff/chamber/${slug}`);

  revalidateTag("chambers-data", "max");
  redirect(buildRedirectPath(`Chamber created: ${name}.`));
}

export async function assignChamberRoleAction(formData: FormData) {
  const { userId } = await auth();

  if (!(await isAdminUser(userId))) {
    redirect(buildRedirectPath("Admin access required.", true));
  }

  const chamberSlug = String(formData.get("chamberSlug") ?? "").trim();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!chamberSlug || !targetUserId || !isValidRole(role)) {
    redirect(buildRedirectPath("Invalid role assignment input.", true));
  }

  const chamber = await getOrCreateChamberRecordBySlug(chamberSlug);

  if (!chamber) {
    redirect(
      buildRedirectPath(
        "Database not initialized. Run `bun run db:migrate` before managing roles.",
        true,
      ),
    );
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(chamberRoles)
        .where(
          and(
            eq(chamberRoles.chamberId, chamber.id),
            eq(chamberRoles.userId, targetUserId),
          ),
        );

      await tx.insert(chamberRoles).values({
        id: `${chamber.id}:${targetUserId}`.slice(0, 64),
        chamberId: chamber.id,
        userId: targetUserId,
        role,
        createdAt: new Date(),
      });
    });
  } catch {
    redirect(
      buildRedirectPath(
        "Unable to save role assignment. Confirm migrations are applied.",
        true,
      ),
    );
  }

  revalidatePath("/staff/admin");
  revalidatePath(`/staff/chamber/${chamberSlug}`);
  revalidatePath(`/chamber/${chamberSlug}`);

  revalidateTag("chambers-data", "max");
  redirect(buildRedirectPath("Role assignment saved."));
}

export async function removeChamberRoleAction(formData: FormData) {
  const { userId } = await auth();

  if (!(await isAdminUser(userId))) {
    redirect(buildRedirectPath("Admin access required.", true));
  }

  const chamberId = String(formData.get("chamberId") ?? "").trim();
  const chamberSlug = String(formData.get("chamberSlug") ?? "").trim();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!chamberId || !chamberSlug || !targetUserId) {
    redirect(buildRedirectPath("Invalid remove request.", true));
  }

  try {
    await db
      .delete(chamberRoles)
      .where(
        and(
          eq(chamberRoles.chamberId, chamberId),
          eq(chamberRoles.userId, targetUserId),
        ),
      );
  } catch {
    redirect(
      buildRedirectPath(
        "Unable to remove role assignment. Confirm migrations are applied.",
        true,
      ),
    );
  }

  revalidatePath("/staff/admin");
  revalidatePath(`/staff/chamber/${chamberSlug}`);
  revalidatePath(`/chamber/${chamberSlug}`);

  revalidateTag("chambers-data", "max");
  redirect(buildRedirectPath("Role assignment removed."));
}

export async function addAdminUserAction(formData: FormData) {
  const { userId } = await auth();

  if (!(await isAdminUser(userId))) {
    redirect(buildRedirectPath("Admin access required.", true));
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!targetUserId) {
    redirect(buildRedirectPath("Admin user ID is required.", true));
  }

  try {
    await db
      .insert(appAdmins)
      .values({ userId: targetUserId, createdAt: new Date() })
      .onConflictDoNothing();
  } catch {
    redirect(
      buildRedirectPath(
        "Unable to add admin user. Confirm migrations are applied.",
        true,
      ),
    );
  }

  revalidatePath("/staff/admin");
  redirect(buildRedirectPath("Admin user added."));
}

export async function removeAdminUserAction(formData: FormData) {
  const { userId } = await auth();

  if (!(await isAdminUser(userId))) {
    redirect(buildRedirectPath("Admin access required.", true));
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!targetUserId) {
    redirect(buildRedirectPath("Admin user ID is required.", true));
  }

  try {
    const existingAdmins = await db
      .select({ userId: appAdmins.userId })
      .from(appAdmins);

    if (
      existingAdmins.length <= 1 &&
      existingAdmins[0]?.userId === targetUserId
    ) {
      redirect(buildRedirectPath("Cannot remove the last admin user.", true));
    }

    await db.delete(appAdmins).where(eq(appAdmins.userId, targetUserId));
  } catch {
    redirect(
      buildRedirectPath(
        "Unable to remove admin user. Confirm migrations are applied.",
        true,
      ),
    );
  }

  revalidatePath("/staff/admin");
  redirect(buildRedirectPath("Admin user removed."));
}
