import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const chambers = pgTable(
  "chambers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    body: varchar("body", { length: 20 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    chambersNameIdx: index("chambers_name_idx").on(table.name),
  }),
);

export const bills = pgTable(
  "bills",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    chamberId: varchar("chamber_id", { length: 64 })
      .notNull()
      .references(() => chambers.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    code: varchar("code", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    author: varchar("author", { length: 120 }).notNull(),
    originBody: varchar("origin_body", { length: 120 }).notNull(),
    stage: varchar("stage", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    billsChamberSortIdx: index("bills_chamber_sort_idx").on(
      table.chamberId,
      table.sortOrder,
      table.createdAt,
    ),
  }),
);

export const chamberState = pgTable("chamber_state", {
  chamberId: varchar("chamber_id", { length: 64 })
    .primaryKey()
    .references(() => chambers.id, { onDelete: "cascade" }),
  state: varchar("state", { length: 64 }).notNull(),
  activeBillId: varchar("active_bill_id", { length: 64 }),
  updatedByUserId: varchar("updated_by_user_id", { length: 255 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chamberRoles = pgTable(
  "chamber_roles",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    chamberId: varchar("chamber_id", { length: 64 })
      .notNull()
      .references(() => chambers.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: varchar("role", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    chamberRolesUserChamberRoleIdx: index("chamber_roles_user_chamber_role_idx").on(
      table.userId,
      table.chamberId,
      table.role,
    ),
    chamberRolesChamberUserIdx: index("chamber_roles_chamber_user_idx").on(
      table.chamberId,
      table.userId,
    ),
  }),
);

export const stateEvents = pgTable(
  "state_events",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    chamberId: varchar("chamber_id", { length: 64 })
      .notNull()
      .references(() => chambers.id, { onDelete: "cascade" }),
    state: varchar("state", { length: 64 }).notNull(),
    billId: varchar("bill_id", { length: 64 }),
    note: varchar("note", { length: 255 }),
    updatedByUserId: varchar("updated_by_user_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    stateEventsChamberCreatedIdx: index("state_events_chamber_created_idx").on(
      table.chamberId,
      table.createdAt,
    ),
  }),
);

export const stageOptions = pgTable(
  "stage_options",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    label: varchar("label", { length: 64 }).notNull().unique(),
    sortOrder: integer("sort_order").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    stageOptionsActiveSortIdx: index("stage_options_active_sort_idx").on(
      table.isActive,
      table.sortOrder,
      table.label,
    ),
  }),
);

export const appAdmins = pgTable("app_admins", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
