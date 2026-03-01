"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db/client";
import {
  bills as billsTable,
  chamberState as chamberStateTable,
  stateEvents,
} from "@/db/schema";
import { getOrCreateChamberRecordBySlug } from "@/lib/chamber-data";
import { canUpdateChamber } from "@/lib/permissions";
import { isValidStageOption } from "@/lib/stage-options";
import { type UpdateStageActionState } from "./stage-update-state";

export async function updateChamberStageAction(
  _previous: UpdateStageActionState,
  formData: FormData,
): Promise<UpdateStageActionState> {
  const { userId } = await auth();

  if (!userId) {
    return {
      status: "error",
      message: "Sign in is required to update chamber state.",
    };
  }

  const slug = String(formData.get("slug") ?? "");
  const requestedState = String(formData.get("state") ?? "");

  if (!slug) {
    return {
      status: "error",
      message: "Missing chamber slug.",
    };
  }

  if (!(await isValidStageOption(requestedState))) {
    return {
      status: "error",
      message: "Invalid chamber state.",
    };
  }

  const chamber = await getOrCreateChamberRecordBySlug(slug);

  if (!chamber) {
    return {
      status: "error",
      message:
        "Database is not initialized. Run `bun run db:migrate` and try again.",
    };
  }

  const allowed = await canUpdateChamber(userId, chamber.id);

  if (!allowed) {
    return {
      status: "error",
      message:
        "You do not have permission for this chamber. Ask an admin to add a chamber role.",
    };
  }

  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(chamberStateTable)
        .values({
          chamberId: chamber.id,
          state: requestedState,
          activeBillId: null,
          updatedByUserId: userId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: chamberStateTable.chamberId,
          set: {
            state: requestedState,
            updatedByUserId: userId,
            updatedAt: now,
          },
        });

      await tx
        .update(billsTable)
        .set({
          stage: requestedState,
          updatedAt: now,
        })
        .where(eq(billsTable.chamberId, chamber.id));

      await tx.insert(stateEvents).values({
        id: crypto.randomUUID(),
        chamberId: chamber.id,
        state: requestedState,
        billId: null,
        note: "Updated from staff console",
        updatedByUserId: userId,
        createdAt: now,
      });
    });
  } catch {
    return {
      status: "error",
      message:
        "Unable to save state update. Confirm database migrations are applied.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/chamber/${slug}`);
  revalidatePath(`/staff/chamber/${slug}`);

  return {
    status: "success",
    message: `Updated stage to ${requestedState}.`,
  };
}

function normalizeOriginBody(value: string): string | null {
  const normalized = value.trim();
  if (!normalized || normalized.length > 120) {
    return null;
  }

  return normalized;
}

async function getAuthorizedChamber(slug: string, userId: string) {
  if (!slug) {
    return null;
  }

  const chamber = await getOrCreateChamberRecordBySlug(slug);

  if (!chamber) {
    return null;
  }

  const allowed = await canUpdateChamber(userId, chamber.id);
  if (!allowed) {
    return null;
  }

  return chamber;
}

function revalidateChamberPaths(slug: string) {
  revalidatePath("/");
  revalidatePath(`/chamber/${slug}`);
  revalidatePath(`/staff/chamber/${slug}`);
  revalidateTag("chambers-data", "max");
}

async function normalizeBillSortOrder(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  chamberId: string,
  now: Date,
) {
  await tx.execute(sql`
    WITH ranked AS (
      SELECT
        ${billsTable.id} AS id,
        ROW_NUMBER() OVER (
          ORDER BY ${billsTable.sortOrder}, ${billsTable.createdAt}, ${billsTable.id}
        ) AS rn
      FROM ${billsTable}
      WHERE ${billsTable.chamberId} = ${chamberId}
    )
    UPDATE ${billsTable}
    SET
      ${billsTable.sortOrder} = ranked.rn,
      ${billsTable.updatedAt} = ${now}
    FROM ranked
    WHERE
      ${billsTable.id} = ranked.id
      AND ${billsTable.chamberId} = ${chamberId}
      AND ${billsTable.sortOrder} IS DISTINCT FROM ranked.rn
  `);
}

export async function upsertDocketBillAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const billRecordId = String(formData.get("billRecordId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const originBody = normalizeOriginBody(
    String(formData.get("originBody") ?? "").trim(),
  );

  if (!slug || !code || !title || !author || !originBody) {
    return;
  }

  const chamber = await getAuthorizedChamber(slug, userId);
  if (!chamber) {
    return;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const [stateRow] = await tx
      .select({
        state: chamberStateTable.state,
        activeBillId: chamberStateTable.activeBillId,
      })
      .from(chamberStateTable)
      .where(eq(chamberStateTable.chamberId, chamber.id))
      .limit(1);

    const mergedStage = stateRow?.state ?? "No Active Bill";

    if (billRecordId) {
      await tx
        .update(billsTable)
        .set({
          code,
          title,
          author,
          originBody,
          stage: mergedStage,
          updatedAt: now,
        })
        .where(
          and(
            eq(billsTable.id, billRecordId),
            eq(billsTable.chamberId, chamber.id),
          ),
        );

      await tx
        .update(chamberStateTable)
        .set({
          activeBillId: billRecordId,
          updatedByUserId: userId,
          updatedAt: now,
        })
        .where(eq(chamberStateTable.chamberId, chamber.id));

      return;
    }

    const [maxOrderRow] = await tx
      .select({
        maxSortOrder: sql<number>`coalesce(max(${billsTable.sortOrder}), 0)`,
      })
      .from(billsTable)
      .where(eq(billsTable.chamberId, chamber.id));

    const nextSortOrder = (maxOrderRow?.maxSortOrder ?? 0) + 1;
    const newBillId = crypto.randomUUID();

    await tx.insert(billsTable).values({
      id: newBillId,
      chamberId: chamber.id,
      sortOrder: nextSortOrder,
      code,
      title,
      author,
      originBody,
      stage: mergedStage,
      createdAt: now,
      updatedAt: now,
    });

    if (!stateRow?.activeBillId) {
      await tx
        .insert(chamberStateTable)
        .values({
          chamberId: chamber.id,
          state: mergedStage,
          activeBillId: newBillId,
          updatedByUserId: userId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: chamberStateTable.chamberId,
          set: {
            activeBillId: newBillId,
            updatedByUserId: userId,
            updatedAt: now,
          },
        });
    }
  });

  revalidateChamberPaths(slug);
}

export async function deleteDocketBillAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const billRecordId = String(formData.get("billRecordId") ?? "").trim();

  if (!slug || !billRecordId) {
    return;
  }

  const chamber = await getAuthorizedChamber(slug, userId);
  if (!chamber) {
    return;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(billsTable)
      .where(
        and(
          eq(billsTable.id, billRecordId),
          eq(billsTable.chamberId, chamber.id),
        ),
      );

    const [stateRow] = await tx
      .select({ activeBillId: chamberStateTable.activeBillId })
      .from(chamberStateTable)
      .where(eq(chamberStateTable.chamberId, chamber.id))
      .limit(1);

    if (stateRow?.activeBillId === billRecordId) {
      await tx
        .update(chamberStateTable)
        .set({
          activeBillId: null,
          updatedByUserId: userId,
          updatedAt: now,
        })
        .where(eq(chamberStateTable.chamberId, chamber.id));
    }

    await normalizeBillSortOrder(tx, chamber.id, now);
  });

  revalidateChamberPaths(slug);
}

export async function moveDocketBillAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const billRecordId = String(formData.get("billRecordId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();

  if (!slug || !billRecordId || (direction !== "up" && direction !== "down")) {
    return;
  }

  const chamber = await getAuthorizedChamber(slug, userId);
  if (!chamber) {
    return;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const bills = await tx
      .select({ id: billsTable.id, sortOrder: billsTable.sortOrder })
      .from(billsTable)
      .where(eq(billsTable.chamberId, chamber.id))
      .orderBy(asc(billsTable.sortOrder), asc(billsTable.createdAt));

    const currentIndex = bills.findIndex((bill) => bill.id === billRecordId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= bills.length) {
      return;
    }

    const currentBill = bills[currentIndex];
    const targetBill = bills[targetIndex];

    await tx
      .update(billsTable)
      .set({ sortOrder: targetBill.sortOrder, updatedAt: now })
      .where(
        and(
          eq(billsTable.id, currentBill.id),
          eq(billsTable.chamberId, chamber.id),
        ),
      );

    await tx
      .update(billsTable)
      .set({ sortOrder: currentBill.sortOrder, updatedAt: now })
      .where(
        and(
          eq(billsTable.id, targetBill.id),
          eq(billsTable.chamberId, chamber.id),
        ),
      );

    await normalizeBillSortOrder(tx, chamber.id, now);
  });

  revalidateChamberPaths(slug);
}
