---
tags: [postgresql, drizzle, drizzle-kit, migrations]
status: learning
---

# 04. `drizzle-kit push` and Migrations

← [[00-Index|Back to Index]]

## Why Do We Need `drizzle-kit`?
Right now, our 6 tables exist **only as TypeScript code** in `src/db/schema.ts`. Inside our Docker PostgreSQL container, the `raehyung` database is still completely empty!

**`drizzle-kit`** is Drizzle's CLI tool that reads `src/db/schema.ts`, compares it against your PostgreSQL database, and generates/applies the `CREATE TABLE`, `ALTER TABLE`, and `CREATE INDEX` SQL automatically.

### Key Terms
- **`drizzle.config.ts`**: Configuration file telling `drizzle-kit` where your schema file is, which DB dialect (`postgresql`) you use, and how to connect (`DATABASE_URL`).
- **`drizzle-kit push` (Dev Shortcut)**: Connects directly to PostgreSQL and syncs your schema immediately **without creating migration files**. Fast and convenient while prototyping locally.
- **`drizzle-kit generate` + `migrate` (Production Standard)**: Generates timestamped `.sql` migration files in `./drizzle/` so every schema change is tracked in Git, reviewed in PRs, and applied safely in order on production servers.
- **`drizzle-kit studio`**: Launches a local web GUI where you can browse and edit your PostgreSQL tables visually.

| Command | Creates `.sql` Files? | Best Used When |
| --- | --- | --- |
| `drizzle-kit push` | No | Local development / rapid prototyping |
| `drizzle-kit generate` | Yes (`./drizzle/*.sql`) | Preparing a tracked change for Git / production |
| `drizzle-kit migrate` | Applies existing `.sql` files | Deploying to staging / production |

---

## Syntax Breakdown

### 1. `drizzle.config.ts` (Project Root)
Notice we call `process.loadEnvFile()` here too so `drizzle-kit` can read `DATABASE_URL` from `.env` without installing `dotenv`.

```ts
import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // Env vars already set by OS
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

The trailing `!` on `process.env.DATABASE_URL!` is TypeScript's **non-null assertion operator**. It is erased at compile time and does nothing at runtime.

`process.env` values are typed as `string | undefined`, because a key might be missing. `defineConfig` requires `url` to be a `string`. The `!` tells the type checker: "treat this as a `string` and stop warning me about `undefined`." It does **not** check that `.env` actually contains `DATABASE_URL`. If the variable is missing, `drizzle-kit` still receives `undefined` and fails when it tries to connect.

The app's real check lives in `src/config/env.ts`, where Zod's `z.string().url()` rejects a missing or malformed `DATABASE_URL` at startup. The `!` here is only a type-level shortcut for this CLI config file.

### 2. `db = drizzle(pool, { schema })` Does **Not** Create Tables
This line in `src/db/index.ts` only builds a TypeScript query client:

```ts
export const db = drizzle(pool, { schema });
```

| Piece | What it actually does |
| --- | --- |
| `pool` | Reuses TCP connections to PostgreSQL. It does not design tables. |
| `{ schema }` | Hands Drizzle the TypeScript table objects from `src/db/schema.ts` so `.select()` / `.insert()` know column names and types. |
| `drizzle(...)` | Returns a client object. Running this line sends **zero** `CREATE TABLE` SQL. |

The tables you see with `\dt` were created earlier by **`npm run db:push`** (`drizzle-kit push`). That CLI reads `src/db/schema.ts`, connects with `DATABASE_URL` from `drizzle.config.ts`, and runs `CREATE TABLE` / `CREATE INDEX` inside the Docker PostgreSQL container.

```text
src/db/schema.ts          TypeScript blueprint only
        |
        |  npm run db:push   (drizzle-kit, one-time / when schema changes)
        v
PostgreSQL in Docker      real tables, foreign keys, indexes
        ^
        |  db.select()...    (drizzle client, every API request)
src/db/index.ts           query client over the existing tables
```

### 3. Inspecting the Real Database: `docker compose exec ... psql`

```bash
docker compose exec postgres psql -U raehyung -d raehyung -c "\dt"
```

| Token | Meaning |
| --- | --- |
| `docker compose exec` | Run a command **inside an already running container** (does not start a new one). |
| `postgres` | The Compose **service name** from `docker-compose.yml` (`services.postgres`), not the project name `steward`. |
| `psql` | PostgreSQL's interactive SQL shell, already installed inside the `postgres:16-alpine` image. |
| `-U raehyung` | Connect as database user `raehyung` (`POSTGRES_USER`). |
| `-d raehyung` | Connect to database `raehyung` (`POSTGRES_DB`). |
| `-c "..."` | Run one command and exit, instead of opening an interactive prompt. |
| `\dt` | **psql meta-command** (not SQL). Lists tables in the current database. The backslash commands exist only inside `psql`. |

Related meta-commands:

```bash
# Columns, indexes, and foreign keys for one table
docker compose exec postgres psql -U raehyung -d raehyung -c "\d usage_daily_stats"

# Same shell, but stay inside for more commands (quit with \q)
docker compose exec postgres psql -U raehyung -d raehyung
```

### 4. Adding Scripts to `package.json`
```json
"scripts": {
  "db:push": "drizzle-kit push",
  "db:generate": "drizzle-kit generate",
  "db:studio": "drizzle-kit studio"
}
```

---

## Hands-on Test & Product Build Checklist

- [ ] 1. Install `drizzle-kit` as a dev dependency:
  ```bash
  npm install -D drizzle-kit
  ```
- [ ] 2. Create `drizzle.config.ts` in the project root using the config above
- [ ] 3. Add `db:push`, `db:generate`, and `db:studio` to `package.json` `"scripts"`
- [ ] 4. Make sure PostgreSQL is running (`docker compose up -d`), then push your 6 tables:
  ```bash
  npm run db:push
  ```
- [ ] 5. Inspect your real PostgreSQL tables inside Docker with `psql`:
  ```bash
  # List all 6 tables
  docker compose exec postgres psql -U raehyung -d raehyung -c "\dt"

  # Inspect columns, foreign keys, and indexes on usage_daily_stats
  docker compose exec postgres psql -U raehyung -d raehyung -c "\d usage_daily_stats"
  ```
- [ ] 6. Look at the output of `\d usage_daily_stats` — verify you can see:
  - `bigint` on `bytes_transferred`
  - `usage_daily_stats_user_date_domain_uidx` (UNIQUE btree)
  - `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

> **Next Step Preview**: Now that real tables exist in PostgreSQL, we'll learn the #1 query behind Steward's high-throughput write engine: [[04-Postgres-Drizzle/05-batch-upsert|05. High-Throughput Writes: INSERT ... ON CONFLICT DO UPDATE]].
