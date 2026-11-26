---
tags: [postgresql, pg, connection-pool, database]
status: learning
---

# 01. `pg.Pool` Connection Pooling

← [[00-Index|Back to Index]]

## Why Use a Connection Pool Instead of a Single Connection?
Opening a brand-new database connection for every HTTP request is expensive:
1. TCP handshake + authentication + PostgreSQL spawning a new OS process for that client (~20–50ms wasted per request).
2. PostgreSQL has a hard limit on concurrent connections (`max_connections`, usually **100** by default). If 500 users send heartbeats at the same time and each opens a new connection, Postgres rejects connections and crashes your API.

A **Connection Pool (`pg.Pool`)** keeps a small, reusable set of open connections (e.g., `max: 20`). When a query arrives, it borrows an idle connection, runs the SQL, and **immediately returns it to the pool** for the next request.

### Key Terms
- **`pg` (`node-postgres`)**: The low-level PostgreSQL driver for Node.js. Even when we add Drizzle ORM next, Drizzle uses `pg.Pool` underneath to talk to Postgres.
- **Connection Pool**: A managed cache of reusable DB connections. If all 20 connections are busy, the 21st query briefly waits in a queue instead of overwhelming Postgres.
- **Connection String (`DATABASE_URL`)**: A single URL encoding everything needed to connect:
  `postgres://<user>:<password>@<host>:<port>/<database>`
- **Parameterized Query (`$1`, `$2`)**: Passing user input as separate parameters instead of string interpolation — **completely prevents SQL Injection**.
- **`pool.end()`**: Closes all open connections cleanly when the server shuts down.

---

## Syntax Breakdown

### 1. Creating a Pool
```ts
import pg from "pg";
import { env } from "../config/env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // maximum number of concurrent DB connections in this pool
});
```

### 2. Running a Query with `pool.query()`
`pool.query()` automatically borrows a connection, runs the SQL, and releases the connection back to the pool.

```ts
// Simple health check query
const result = await pool.query("SELECT NOW() AS server_time, current_user");
console.log(result.rows[0]);
// { server_time: 2026-..., current_user: "raehyung" }
```

### 3. Parameterized Queries (Never Use String Templates for User Input!)
```ts
// ✅ SAFE: PostgreSQL binds $1 as data, never executable SQL
const name = "raehyung";
const res = await pool.query("SELECT $1::text AS greeting", [`Hello, ${name}`]);
console.log(res.rows[0]); // { greeting: "Hello, raehyung" }

// ❌ DANGEROUS (SQL Injection!):
// await pool.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

### 4. Closing the Pool (`pool.end()`)
If a short script doesn't call `pool.end()`, Node.js will stay open waiting on idle DB sockets.
```ts
await pool.end();
```

---

## Real Product Example: `src/db/index.ts` (Step 1: Pool Only)

We'll start `src/db/index.ts` with `pool` + `checkDbHealth()`, and add Drizzle on top of this same `pool` in the next unit.

```ts
import pg from "pg";
import { env } from "../config/env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
});

export async function checkDbHealth(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
```

---

## Hands-on Test & Product Build Checklist

- [ ] 1. Make sure PostgreSQL is running in Docker (`docker-compose.yml` with `postgres:16-alpine` + `volumes` → `docker compose up -d`)
- [ ] 2. Install `pg` (runtime) and `@types/pg` (dev):
  ```bash
  npm install pg
  npm install -D @types/pg
  ```
- [ ] 3. Create `src/db/index.ts` with `pool` and `checkDbHealth()`
- [ ] 4. In `src/index.ts`, import `checkDbHealth` and `pool`, print the health result + `SELECT current_user`, and call `await pool.end()` at the end
- [ ] 5. Run `npm run dev` — verify `dbHealthy: true` and `current_user: "raehyung"`
- [ ] 6. **(Experiment)** Stop Postgres (`docker compose stop postgres`) and run `npm run dev` again — verify `checkDbHealth()` safely returns `false` instead of crashing the whole process! (Then restart Postgres with `docker compose start postgres`.)
