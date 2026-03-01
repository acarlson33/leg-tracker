import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { stageOptions } from "@/db/schema";
import { chamberStateOptions as defaultStageOptions } from "@/lib/chambers";

const defaultRows = defaultStageOptions.map((label, index) => ({
  id: `stage-${index + 1}`,
  label,
  sortOrder: index,
  isActive: true,
  updatedAt: new Date(),
}));

export async function ensureSeedStageOptions() {
  for (const row of defaultRows) {
    await db
      .insert(stageOptions)
      .values(row)
      .onConflictDoUpdate({
        target: stageOptions.label,
        set: {
          sortOrder: row.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }
}

export async function getStageOptionsForDisplay() {
  return getStageOptionsForDisplayCached();
}

const getStageOptionsForDisplayCached = unstable_cache(
  async () => {
    try {
      let rows = await db
        .select({
          label: stageOptions.label,
          sortOrder: stageOptions.sortOrder,
        })
        .from(stageOptions)
        .where(eq(stageOptions.isActive, true))
        .orderBy(asc(stageOptions.sortOrder), asc(stageOptions.label));

      if (rows.length === 0) {
        await ensureSeedStageOptions();

        rows = await db
          .select({
            label: stageOptions.label,
            sortOrder: stageOptions.sortOrder,
          })
          .from(stageOptions)
          .where(eq(stageOptions.isActive, true))
          .orderBy(asc(stageOptions.sortOrder), asc(stageOptions.label));
      }

      if (rows.length === 0) {
        return [...defaultStageOptions];
      }

      return rows.map((row) => row.label);
    } catch {
      return [...defaultStageOptions];
    }
  },
  ["stage-options-display"],
  { tags: ["stage-options"], revalidate: 60 },
);

export async function isValidStageOption(label: string) {
  const options = await getStageOptionsForDisplay();

  if (options.includes(label)) {
    return true;
  }

  return defaultStageOptions.includes(label as (typeof defaultStageOptions)[number]);
}
