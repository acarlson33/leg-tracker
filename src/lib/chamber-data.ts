import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import {
  bills as billsTable,
  chamberState as chamberStateTable,
  chambers as chambersTable,
} from "@/db/schema";
import {
  chambers as mockChambers,
  getChamberBySlug,
  type Chamber,
} from "@/lib/chambers";

const seedChamberRows = mockChambers.map((chamber) => ({
  id: chamber.slug,
  slug: chamber.slug,
  name: chamber.name,
  body: chamber.body,
  updatedAt: new Date(),
}));

const seedBillRows = mockChambers.flatMap((chamber) =>
  chamber.docket.map((bill, index) => ({
    id: `${chamber.slug}-${bill.id}`,
    chamberId: chamber.slug,
    sortOrder: index + 1,
    code: bill.id,
    title: bill.title,
    author: bill.author,
    originBody: bill.body,
    stage: bill.status,
    updatedAt: new Date(),
  })),
);

function toBody(value: string): "House" | "Senate" {
  return value === "Senate" ? "Senate" : "House";
}

function formatCurrentBillLabel(input: { code: string; title: string }) {
  return `${input.code} - ${input.title}`;
}

function toDisplayBill(input: {
  code: string;
  title: string;
  author: string;
  originBody: string;
  stage: string;
}) {
  return {
    id: input.code,
    title: input.title,
    author: input.author,
    body: input.originBody,
    status: input.stage,
  };
}

function toDisplayChamber(input: {
  slug: string;
  name: string;
  body: string;
  currentState?: string;
  currentBill?: string | null;
  docket?: Chamber["docket"];
}): Chamber {
  const fallback = getChamberBySlug(input.slug);
  const fallbackState = fallback?.currentState ?? "No Active Bill";
  const normalizedState = input.currentState?.trim() || fallbackState;
  const docket = input.docket?.length ? input.docket : (fallback?.docket ?? []);

  return {
    slug: input.slug,
    name: input.name,
    body: toBody(input.body),
    currentState: normalizedState,
    currentBill: input.currentBill ?? fallback?.currentBill ?? null,
    docket,
  };
}

export async function ensureSeedChambers() {
  for (const chamber of seedChamberRows) {
    await db
      .insert(chambersTable)
      .values(chamber)
      .onConflictDoUpdate({
        target: chambersTable.slug,
        set: {
          name: chamber.name,
          body: chamber.body,
          updatedAt: new Date(),
        },
      });
  }

  if (seedBillRows.length > 0) {
    await db.insert(billsTable).values(seedBillRows).onConflictDoNothing();
  }
}

async function getChamberRows() {
  return db
    .select({
      id: chambersTable.id,
      slug: chambersTable.slug,
      name: chambersTable.name,
      body: chambersTable.body,
    })
    .from(chambersTable);
}

async function getStateRows() {
  return db
    .select({
      chamberId: chamberStateTable.chamberId,
      state: chamberStateTable.state,
      activeBillId: chamberStateTable.activeBillId,
    })
    .from(chamberStateTable);
}

async function getBillRows() {
  return db
    .select({
      id: billsTable.id,
      chamberId: billsTable.chamberId,
      sortOrder: billsTable.sortOrder,
      code: billsTable.code,
      title: billsTable.title,
      author: billsTable.author,
      originBody: billsTable.originBody,
      stage: billsTable.stage,
      createdAt: billsTable.createdAt,
    })
    .from(billsTable)
    .orderBy(asc(billsTable.sortOrder), asc(billsTable.createdAt));
}

async function getBillRowsByChamberId(chamberId: string) {
  return db
    .select({
      id: billsTable.id,
      chamberId: billsTable.chamberId,
      sortOrder: billsTable.sortOrder,
      code: billsTable.code,
      title: billsTable.title,
      author: billsTable.author,
      originBody: billsTable.originBody,
      stage: billsTable.stage,
      createdAt: billsTable.createdAt,
    })
    .from(billsTable)
    .where(eq(billsTable.chamberId, chamberId))
    .orderBy(asc(billsTable.sortOrder), asc(billsTable.createdAt));
}

async function getSeededChamberRows() {
  const chamberRows = await getChamberRows();

  if (chamberRows.length > 0) {
    return chamberRows;
  }

  try {
    await ensureSeedChambers();
    return await getChamberRows();
  } catch {
    return chamberRows;
  }
}

async function getChamberBySlugRow(slug: string) {
  const [chamberRow] = await db
    .select({
      id: chambersTable.id,
      slug: chambersTable.slug,
      name: chambersTable.name,
      body: chambersTable.body,
    })
    .from(chambersTable)
    .where(eq(chambersTable.slug, slug))
    .limit(1);

  return chamberRow;
}

async function getSeededChamberBySlugRow(slug: string) {
  const existingChamber = await getChamberBySlugRow(slug);

  if (existingChamber) {
    return existingChamber;
  }

  try {
    await ensureSeedChambers();
    return await getChamberBySlugRow(slug);
  } catch {
    return undefined;
  }
}

const getChambersForDisplayCached = unstable_cache(
  async (): Promise<Chamber[]> => {
    try {
      const chamberRows = await getSeededChamberRows();

      if (chamberRows.length === 0) {
        return mockChambers;
      }

      const [stateRows, billRows] = await Promise.all([
        getStateRows(),
        getBillRows(),
      ]);

      const billsByChamberId = new Map<
        string,
        Awaited<ReturnType<typeof getBillRows>>
      >();
      for (const bill of billRows) {
        const chamberBills = billsByChamberId.get(bill.chamberId) ?? [];
        chamberBills.push(bill);
        billsByChamberId.set(bill.chamberId, chamberBills);
      }

      const stateByChamberId = new Map(
        stateRows.map((row) => [row.chamberId, row]),
      );

      return chamberRows.map((row) => {
        const chamberBills = billsByChamberId.get(row.id) ?? [];
        const docket = chamberBills.map((bill) => toDisplayBill(bill));
        const chamberState = stateByChamberId.get(row.id);
        const activeBill = chamberBills.find(
          (bill) => bill.id === chamberState?.activeBillId,
        );
        const currentBill = activeBill
          ? formatCurrentBillLabel(activeBill)
          : chamberBills[0]
            ? formatCurrentBillLabel(chamberBills[0])
            : undefined;

        return toDisplayChamber({
          slug: row.slug,
          name: row.name,
          body: row.body,
          currentState: chamberState?.state,
          currentBill,
          docket,
        });
      });
    } catch {
      return mockChambers;
    }
  },
  ["chambers-display"],
  { tags: ["chambers-data"], revalidate: 30 },
);

export async function getChambersForDisplay(): Promise<Chamber[]> {
  return getChambersForDisplayCached();
}

const getChamberBySlugForDisplayCached = unstable_cache(
  async (slug: string) => {
    try {
      const chamberRow = await getSeededChamberBySlugRow(slug);

      if (!chamberRow) {
        return undefined;
      }

      const [[stateRow], chamberBills] = await Promise.all([
        db
          .select({
            state: chamberStateTable.state,
            activeBillId: chamberStateTable.activeBillId,
          })
          .from(chamberStateTable)
          .where(eq(chamberStateTable.chamberId, chamberRow.id))
          .limit(1),
        getBillRowsByChamberId(chamberRow.id),
      ]);

      const docket = chamberBills.map((bill) => toDisplayBill(bill));
      const activeBill = chamberBills.find(
        (bill) => bill.id === stateRow?.activeBillId,
      );
      const currentBill = activeBill
        ? formatCurrentBillLabel(activeBill)
        : chamberBills[0]
          ? formatCurrentBillLabel(chamberBills[0])
          : undefined;

      return toDisplayChamber({
        slug: chamberRow.slug,
        name: chamberRow.name,
        body: chamberRow.body,
        currentState: stateRow?.state,
        currentBill,
        docket,
      });
    } catch {
      return getChamberBySlug(slug);
    }
  },
  ["chamber-by-slug-display"],
  { tags: ["chambers-data"], revalidate: 30 },
);

export async function getChamberBySlugForDisplay(slug: string) {
  return getChamberBySlugForDisplayCached(slug);
}

export async function getOrCreateChamberRecordBySlug(slug: string) {
  try {
    const chamberRow = await getSeededChamberBySlugRow(slug);
    return chamberRow;
  } catch {
    return null;
  }
}

export type EditableDocketBill = {
  recordId: string;
  sortOrder: number;
  code: string;
  title: string;
  author: string;
  body: string;
};

const getEditableDocketForSlugCached = unstable_cache(
  async (slug: string): Promise<EditableDocketBill[]> => {
    try {
      const chamberRow = await getSeededChamberBySlugRow(slug);

      if (!chamberRow) {
        return [];
      }

      const billRows = await getBillRowsByChamberId(chamberRow.id);

      return billRows.map((bill, index) => ({
        recordId: bill.id,
        sortOrder: index + 1,
        code: bill.code,
        title: bill.title,
        author: bill.author,
        body: bill.originBody,
      }));
    } catch {
      return [];
    }
  },
  ["editable-docket-by-slug"],
  { tags: ["chambers-data"], revalidate: 30 },
);

export async function getEditableDocketForSlug(
  slug: string,
): Promise<EditableDocketBill[]> {
  return getEditableDocketForSlugCached(slug);
}

const getBillOriginOptionsForDisplayCached = unstable_cache(
  async (): Promise<string[]> => {
    const baseOptions = ["House", "Senate"];

    try {
      const chamberRows = await getSeededChamberRows();
      const options = new Set<string>(baseOptions);

      for (const chamber of chamberRows) {
        if (chamber.name?.trim()) {
          options.add(chamber.name.trim());
        }
      }

      return Array.from(options);
    } catch {
      const options = new Set<string>(baseOptions);
      for (const chamber of mockChambers) {
        if (chamber.name?.trim()) {
          options.add(chamber.name.trim());
        }
      }
      return Array.from(options);
    }
  },
  ["bill-origin-options"],
  { tags: ["chambers-data"], revalidate: 60 },
);

export async function getBillOriginOptionsForDisplay(): Promise<string[]> {
  return getBillOriginOptionsForDisplayCached();
}
