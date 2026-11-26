---
tags: [redis, cache, postgresql, invalidation]
status: learning
---

# 02. Cache-Aside and Invalidation

← [[00-Index|Back to Index]]

## What Cache-Aside Means
The application, not Redis, decides when to fill the cache.

1. Read the key from Redis.
2. On a hit, return that value and do not query PostgreSQL.
3. On a miss (`GET` returns `null`), read PostgreSQL, store the result in Redis with a TTL, then return it.

PostgreSQL stays the source of truth. Redis holds a copy that is allowed to disappear.

### Key Terms
- **Cache hit**: `GET` returned a stored string.
- **Cache miss**: `GET` returned `null` because the key was never set or its TTL elapsed.
- **Invalidation**: Deleting the key after a write so the next read cannot return a stale copy.
- **Stale cache**: Redis still holds `durationSec: 45` after PostgreSQL has been updated to `60`.

---

## Why the Value Is JSON
Redis `SET` / `GET` speak in strings. A stats row has several fields, so the app serializes the row:

```ts
await redis.set(key, JSON.stringify(rows), "EX", 60);
const cached = await redis.get(key);
const rows = cached === null ? null : JSON.parse(cached);
```

`JSON.parse` returns `any` unless you check the shape. For this exercise, treat the parsed value as the same array `db.select()` returned.

---

## Read Path

Use one key per user per day. The date matches `usage_daily_stats.start_date`.

```ts
import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import { env } from "./config/env.js";
import { db } from "./db/index.js";
import { usageDailyStats, users } from "./db/schema.js";

const redis = new Redis(env.REDIS_URL);

const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, "raehyung@example.com"));

const cacheKey = `steward:usage:${user.id}:2026-11-23`;
const cached = await redis.get(cacheKey);

let rows: unknown;
if (cached !== null) {
  rows = JSON.parse(cached);
  console.log("hit", rows);
} else {
  rows = await db
    .select()
    .from(usageDailyStats)
    .where(eq(usageDailyStats.userId, user.id));
  await redis.set(cacheKey, JSON.stringify(rows), "EX", 60);
  console.log("miss", rows);
}
```

The first run prints `miss` and fills Redis. The second run, within 60 seconds, prints `hit` and skips PostgreSQL.

---

## Invalidation After a Write
An upsert changes `duration_sec` in PostgreSQL. The Redis copy still has the old number until the TTL ends. Delete the key in the same place you write:

```ts
await redis.del(cacheKey);
```

The next read is a miss, loads the new `durationSec` from PostgreSQL, and stores a fresh copy. `DEL` on a missing key is fine: Redis returns `0` and does not throw.

Leaving the key in place after a write is the bug. The dashboard would show 45 seconds while the database already has 60.

---

## Hands-on Test Checklist

- [ ] 1. Run the read path twice within 60 seconds. The first log says `miss`, the second says `hit`.
- [ ] 2. Upsert `youtube.com` by another 15 seconds, then read again **without** `DEL`. The cached `durationSec` is still the old number.
- [ ] 3. Call `redis.del(cacheKey)` after the upsert and read again. The log says `miss`, and `durationSec` includes the new 15 seconds.
- [ ] 4. `await redis.quit()` and run `npm run typecheck`.

> **Next Step Preview**: Rate limiting uses Redis as a counter, not as a copy of a PostgreSQL row. See [[05-Redis/03-rate-limiting|03. Rate Limiting with Redis]].
