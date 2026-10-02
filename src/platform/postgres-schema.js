import {
  pgSchema,
  text,
  jsonb,
  timestamp,
  integer,
  bigint,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
const aurat = pgSchema("aurat");
export const records = aurat.table(
  "records",
  {
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.kind, t.id] }),
    index("records_kind_created").on(t.kind, t.createdAt),
  ],
);
export const deliveries = aurat.table("deliveries", {
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});
export const jobs = aurat.table(
  "jobs",
  {
    id: text("id").primaryKey(),
    data: jsonb("data").notNull(),
    state: text("state").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    leaseUntil: bigint("lease_until", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    result: jsonb("result"),
    error: text("error"),
  },
  (t) => [index("jobs_pending").on(t.state, t.leaseUntil, t.createdAt)],
);
