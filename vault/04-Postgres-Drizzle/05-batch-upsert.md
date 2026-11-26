---
tags: [postgresql, drizzle, upsert, on-conflict]
status: learning
---

# 05. High-Throughput Writes: `INSERT ... ON CONFLICT DO UPDATE`

← [[00-Index|Back to Index]]

## Why Upsert Instead of Insert?
A Chrome extension sends a heartbeat every 15 seconds: "`raehyung` looked at `youtube.com` for 15 more seconds."

If every heartbeat inserted a new row, one user would create thousands of rows per day. Steward keeps **one row per `(user, date, domain)`** and adds the new seconds onto that row.

That unique combination already exists as `usage_daily_stats_user_date_domain_uidx` on `(user_id, start_date, domain)`. PostgreSQL can use it as the conflict target.

### Key Terms
- **Upsert**: "Update if the row exists, insert if it does not." One statement, no separate `SELECT` then `INSERT`.
- **`ON CONFLICT (columns)`**: The columns must match a `UNIQUE` index or constraint. A plain `index()` is not enough.
- **`EXCLUDED`**: The row PostgreSQL was about to insert. `excluded.duration_sec` is the new 15 seconds. `usage_daily_stats.duration_sec` is the value already stored.
- **`sql` template tag**: Drizzle helper for a small piece of raw SQL inside an otherwise typed query. Used here so the `SET` clause can say "old value + new value."

---

## The SQL PostgreSQL Actually Runs

```sql
INSERT INTO usage_daily_stats (user_id, start_date, domain, duration_sec)
VALUES ('raehyung-uuid', '2026-11-23', 'youtube.com', 15)
ON CONFLICT (user_id, start_date, domain)
DO UPDATE SET
  duration_sec = usage_daily_stats.duration_sec + EXCLUDED.duration_sec,
  updated_at = now();
```

| Run | What happens | `duration_sec` after |
| --- | --- | --- |
| First heartbeat | No conflicting row, so PostgreSQL inserts | 15 |
| Second heartbeat, same user/date/domain | Conflict, so PostgreSQL adds `EXCLUDED.duration_sec` | 30 |
| Heartbeat for `instagram.com` | Domain differs, so this is a new row | 15 on a second row |

---

## Drizzle Syntax

`onConflictDoUpdate` lives on the insert builder. `target` must be the same columns as the unique index.

```ts
import { sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { usageDailyStats, users } from "./db/schema.js";

const [user] = await db
  .insert(users)
  .values({
    email: "raehyung@example.com",
    passwordHash: "not-a-real-hash-yet",
    displayName: "raehyung",
  })
  .returning({ id: users.id });

await db
  .insert(usageDailyStats)
  .values({
    userId: user.id,
    startDate: "2026-11-23",
    domain: "youtube.com",
    durationSec: 15,
  })
  .onConflictDoUpdate({
    target: [usageDailyStats.userId, usageDailyStats.startDate, usageDailyStats.domain],
    set: {
      durationSec: sql`${usageDailyStats.durationSec} + excluded.duration_sec`,
      updatedAt: new Date(),
    },
  });
```

Run that insert twice. The second call does not create a second `youtube.com` row. It updates the first row from 15 to 30.

---

## Hands-on Test Checklist

- [ ] 1. In `src/index.ts`, import `sql` from `drizzle-orm`, plus `db`, `users`, and `usageDailyStats`
- [ ] 2. Insert one `users` row and keep the returned `id` (the stats table's foreign key requires a real user)
- [ ] 3. Run the `youtube.com` upsert above **twice**
- [ ] 4. Read it back and print the row:
  ```ts
  const rows = await db.select().from(usageDailyStats);
  console.log(rows);
  ```
- [ ] 5. Confirm there is **one** `youtube.com` row and `durationSec` is `30`
- [ ] 6. Remove the experiment from `src/index.ts` when you are done, then run `npm run typecheck`

> **Next Step Preview**: The API should not open a PostgreSQL connection for every heartbeat. Redis comes first, in [[05-Redis/01-ioredis-basics|05-01. ioredis Connection and Basic Commands]].
