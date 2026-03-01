import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db/client";
import { chamberRoles, chambers } from "@/db/schema";
import { ensureSeedChambers } from "@/lib/chamber-data";
import { staffRoles } from "@/lib/permissions";

function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function makeStableRoleId(chamberId: string, userId: string) {
  return createHash("sha256")
    .update(`${chamberId}:${userId}`)
    .digest("hex")
    .slice(0, 64);
}

function isValidRole(role: string) {
  return staffRoles.includes(role as (typeof staffRoles)[number]);
}

function parseArg(flag: string) {
  const index = process.argv.findIndex((value) => value === flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function seed() {
  const usersArg = parseArg("--users");
  const chambersArg = parseArg("--chambers");
  const roleArg = parseArg("--role");

  const userIds = parseCsv(usersArg);
  const requestedChambers = parseCsv(chambersArg);
  const role = (roleArg ?? "evaluator").trim();

  if (userIds.length === 0) {
    console.log(
      "No users provided. Use --users user_a,user_b [--role evaluator] [--chambers house-main,senate-main].",
    );
    return;
  }

  if (!isValidRole(role)) {
    throw new Error(
      `Invalid role: ${role}. Valid roles: ${staffRoles.join(", ")}`,
    );
  }

  await ensureSeedChambers();

  const chamberRows = await db
    .select({ id: chambers.id, slug: chambers.slug })
    .from(chambers);

  const selectedChambers =
    requestedChambers.length > 0
      ? chamberRows.filter((row) => requestedChambers.includes(row.slug))
      : chamberRows;

  if (selectedChambers.length === 0) {
    throw new Error("No matching chambers found for --chambers values.");
  }

  for (const requestedSlug of requestedChambers) {
    if (!chamberRows.some((row) => row.slug === requestedSlug)) {
      throw new Error(`Unknown chamber slug in seed config: ${requestedSlug}`);
    }
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const chamberRow of selectedChambers) {
    for (const userId of userIds) {
      const [existing] = await db
        .select({ id: chamberRoles.id, role: chamberRoles.role })
        .from(chamberRoles)
        .where(
          and(
            eq(chamberRoles.chamberId, chamberRow.id),
            eq(chamberRoles.userId, userId),
          ),
        )
        .limit(1);

      if (existing) {
        if (existing.role !== role) {
          await db
            .update(chamberRoles)
            .set({ role })
            .where(eq(chamberRoles.id, existing.id));
          updatedCount += 1;
        }
        continue;
      }

      await db.insert(chamberRoles).values({
        id: makeStableRoleId(chamberRow.id, userId),
        chamberId: chamberRow.id,
        userId,
        role,
        createdAt: new Date(),
      });
      createdCount += 1;
    }
  }

  console.log(
    `Role seed complete. Created ${createdCount}, updated ${updatedCount}, across ${selectedChambers.length} chamber(s).`,
  );
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed staff roles:", error);
    process.exit(1);
  });
