---
tags: [postgresql, drizzle, index, performance, schema]
status: learning
---

# 03. Indexes (`index`) and Composite Unique Indexes (`uniqueIndex`)

← [[00-Index|Back to Index]]

## Why Do Indexes Matter?
Imagine `usage_daily_stats` has **10,000,000 rows** across thousands of users. Now `raehyung` opens the dashboard:
```sql
SELECT * FROM usage_daily_stats
WHERE user_id = 'raehyung-uuid' AND stat_date = '2026-11-22';
```
- **Without an index (Full Table Scan / `Seq Scan`)**: PostgreSQL reads all 10,000,000 rows from page 1 to the end — slow (seconds) and burns CPU/disk I/O.
- **With an index (`Index Scan`)**: PostgreSQL jumps straight to `raehyung`'s rows using a sorted **B-Tree** lookup (like the index at the back of a textbook) — finishes in **< 1ms**!

### Key Terms
- **B-Tree Index (`index`)**: Default PostgreSQL index structure. Makes `WHERE`, `JOIN`, and `ORDER BY` queries dramatically faster at the cost of a tiny bit of extra disk space and slightly slower `INSERT`s.
- **Composite Index**: An index built across **multiple columns** together, e.g., `(user_id, stat_date)`.
  - **Column order matters!** An index on `(user_id, stat_date)` speeds up queries filtering by `user_id` alone OR `(user_id AND stat_date)`, but **not** `stat_date` alone (leftmost prefix rule).
- **Composite Unique Index (`uniqueIndex`)**: Guarantees that the **combination** of columns is unique across the entire table.
  - Example: On `(user_id, stat_date, domain)`, `raehyung` can have **only one row** for `youtube.com` on `2026-11-22` — while another user can also have their own `youtube.com` row on `2026-11-22`.
  - **Crucial for Steward**: PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE` (Upsert) **requires** a unique constraint/index on the conflict columns!
- **`bigint` vs `integer` for Bytes**: A 32-bit PostgreSQL `integer` maxes out at **~2.14 GB** (`2,147,483,647`). Watching HD YouTube for a couple hours easily exceeds 2.1 GB, so `bytes_transferred` must be **`bigint`** (`mode: "number"` in Drizzle).

---

## Syntax Breakdown in Drizzle

`pgTable()` accepts an optional **3rd argument**: a callback `(table) => [ ... ]` returning an array of indexes.

```ts
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const usageDailyStats = pgTable(
  "usage_daily_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    statDate: date("stat_date").notNull(),
    domain: text("domain").notNull(),
    durationSec: integer("duration_sec").notNull().default(0),
    requestCount: integer("request_count").notNull().default(0),
    bytesTransferred: bigint("bytes_transferred", { mode: "number" }).notNull().default(0),
    isThirdParty: boolean("is_third_party").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // 1. Guarantees 1 row per (user, date, domain) AND enables fast Batch Upsert.
    // Because of the leftmost prefix rule, this single index ALSO speeds up
    // queries filtering by (user_id) or (user_id, stat_date) — no redundant
    // second index needed on this write-heavy table!
    uniqueIndex("usage_daily_stats_user_date_domain_uidx").on(
      table.userId,
      table.statDate,
      table.domain,
    ),
  ],
);
```

### Why Also Index Foreign Keys?
PostgreSQL automatically creates an index for **Primary Keys** and **`.unique()`** columns, but it does **NOT** automatically index **Foreign Keys**!
So adding `index("devices_user_id_idx").on(table.userId)` on `devices` makes `WHERE user_id = ...` (and `ON DELETE CASCADE`) fast.

---

## Remaining 3 Product Tables to Complete `src/db/schema.ts`

```ts
export const rules = pgTable(
  "rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    dailyLimitMin: integer("daily_limit_min").notNull(), // 0 = always blocked
    isBlocked: boolean("is_blocked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("rules_user_domain_uidx").on(table.userId, table.domain)],
);

export const accountabilityPartners = pgTable(
  "accountability_partners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    webhookUrl: text("webhook_url").notNull(),
    webhookSecret: text("webhook_secret").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("partners_user_id_idx").on(table.userId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => accountabilityPartners.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(), // "limit_exceeded" | "harmful_site" | "heartbeat_lost"
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("pending"), // pending | delivered | failed | dlq
    attempts: integer("attempts").notNull().default(0),
    lastStatusCode: integer("last_status_code"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [index("webhook_deliveries_partner_status_idx").on(table.partnerId, table.status)],
);
```

---

## Hands-on Test & Product Build Checklist

- [ ] 1. Update `src/db/schema.ts`:
  - Add `index("devices_user_id_idx").on(table.userId)` as the 3rd argument on `devices`
  - Add the remaining 4 tables: `usageDailyStats`, `rules`, `accountabilityPartners`, `webhookDeliveries`
- [ ] 2. Clean up the temporary `testUser` line in `src/index.ts`
- [ ] 3. Run `npm run typecheck` — verify all 6 tables and indexes type-check with 0 errors!

> **Next Step Preview**: Right now all 6 tables only exist in TypeScript (`src/db/schema.ts`), **not yet inside PostgreSQL**. Next, in [[04-Postgres-Drizzle/04-drizzle-kit-push|04. drizzle-kit push and Migrations]], we'll push this schema into our Docker PostgreSQL container and inspect the real tables and indexes with `psql`!
