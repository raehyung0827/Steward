---

## tags: [postgresql, drizzle, orm, schema, foreign-key]
status: learning

# 02. Drizzle `pgTable` Columns and Foreign Keys

← [[00-Index|Back to Index]]

## Why Use Drizzle ORM on Top of `pg.Pool`?

With raw `pg.Pool`, SQL queries are plain strings — TypeScript cannot tell if you misspelled a column name (`emial` instead of `email`) or forgot a required field until the query crashes at runtime.

**Drizzle ORM** lets you define your PostgreSQL tables in TypeScript (`src/db/schema.ts`). From that single definition, Drizzle gives you:

1. Full TypeScript autocomplete & type checking for every query (`SELECT`, `INSERT`, `UPDATE`).
2. SQL-like syntax with zero heavy magic (you still think in real PostgreSQL!).
3. Automatic table creation / migrations via `drizzle-kit` (covered in Unit 04).

### Key Terms

- **ORM (Object-Relational Mapping)**: A bridge that maps database tables/rows to TypeScript objects.
- **Primary Key (PK)**: A column that uniquely identifies every row in a table. We use **UUID (**`uuid`**)** instead of auto-incrementing integers (`1, 2, 3`) so external users cannot guess how many users exist (`/users/1`, `/users/2`).
- **Foreign Key (FK)**: A column in Table B (e.g., `devices.user_id`) that points to the Primary Key of Table A (`users.id`). PostgreSQL enforces **referential integrity** — you cannot insert a device for a `user_id` that doesn't exist.
- `onDelete: "cascade"`: If a user deletes their account from `users`, PostgreSQL automatically deletes all of their rows in `devices` so no orphaned records are left behind.
- `camelCase` **(TS) vs** `snake_case` **(DB)**: In TypeScript we write `passwordHash`, while PostgreSQL convention is `password_hash`. Drizzle maps them cleanly: `passwordHash: text("password_hash")`.

---

## Syntax Breakdown

### 1. Defining a Table with `pgTable(tableName, columns)`

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 2. Common PostgreSQL Column Types & Modifiers

| Drizzle Helper | PostgreSQL Type | Meaning |
| --- | --- | --- |
| `uuid("id").defaultRandom().primaryKey()` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Auto-generated unique ID |
| `text("email").notNull().unique()` | `TEXT NOT NULL UNIQUE` | Required string, no duplicates allowed |
| `integer("duration_sec").notNull().default(0)` | `INTEGER NOT NULL DEFAULT 0` | Whole number with default `0` |
| `boolean("is_blocked").notNull().default(false)` | `BOOLEAN NOT NULL DEFAULT false` | True/false flag |
| `timestamp("created_at", { withTimezone: true }).defaultNow()` | `TIMESTAMPTZ DEFAULT now()` | Always store timestamps **with timezone** (`TIMESTAMPTZ`) in backends! |

### 3. Defining a Foreign Key with `.references()`

A **Foreign Key (FK)** forces PostgreSQL to guarantee that a column's value always points to a real Primary Key in another table. It gives you two protections automatically:

1. **Blocks orphan inserts**: If you try to insert a device with `user_id = 'u-999'` but no row with `id = 'u-999'` exists in `users`, PostgreSQL rejects the insert with a foreign key violation error.
2. **`onDelete: "cascade"`**: If a user (`u-111`) is deleted from `users`, PostgreSQL automatically deletes every row in `devices` where `user_id = 'u-111'` — no leftover orphan records.

Pass an arrow function `() => parentTable.column` and an `onDelete` policy:

```ts
export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Notice `lastHeartbeatAt` has **no** `.notNull()` — it is nullable (`Date | null`) because a newly registered device hasn't sent its first heartbeat yet!

### 4. Wrapping `pg.Pool` with `drizzle()`

In `src/db/index.ts`, pass our existing `pool` and `schema` into `drizzle()`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
});

export const db = drizzle(pool, { schema });
```

### 5. Bonus: Free TypeScript Types from Your Schema

```ts
type User = typeof users.$inferSelect;       // Type of a row read from DB
type NewUser = typeof users.$inferInsert;    // Type required when inserting a row

// Example:
const exampleUser: NewUser = {
  email: "raehyung@example.com",
  passwordHash: "hashed_pw",
  displayName: "raehyung",
};
```

---

## Hands-on Test & Product Build Checklist

- [ ] 1. Install `drizzle-orm` as a runtime dependency: `npm install drizzle-orm`
- [ ] 2. Create `src/db/schema.ts` with the first 2 real tables: `users` and `devices` (using the code above)
- [ ] 3. Update `src/db/index.ts` to export `db = drizzle(pool, { schema })`
- [ ] 4. **(Type Experiment)** In `src/index.ts`, try defining `const testUser: typeof users.$inferInsert = { email: "raehyung@example.com" }` (*missing* `passwordHash` *and* `displayName`*)* and hover / run `npm run typecheck` — watch TypeScript immediately tell you which DB columns are missing!
- [ ] 5. Remove the test variable and confirm `npm run typecheck` passes with 0 errors

> **Next Step Preview**: Right now `devices` has a `user_id` foreign key, and next we'll add `usage_daily_stats` — where querying millions of rows without an **index** would be painfully slow. We'll learn `index()` and `uniqueIndex()` in [[04-Postgres-Drizzle/03-indexes-and-unique|03. Indexes and Composite Unique Indexes]].
