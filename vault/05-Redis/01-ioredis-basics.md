---
tags: [redis, ioredis, cache, docker]
status: learning
---

# 01. `ioredis` Connection and Basic Commands

← [[00-Index|Back to Index]]

## Why Redis Is a Separate Server
PostgreSQL stores Steward's durable rows: users, daily stats, rules. Redis stores small values that must be read or updated in memory, with an optional expiry time.

Steward will use Redis for three jobs later:

- Cache a user's dashboard stats so every page load does not hit PostgreSQL.
- Count requests per device for rate limiting.
- Remember a short-lived token or lock.

Redis is not a second PostgreSQL. It keeps data in memory, talks in simple commands (`SET`, `GET`, `INCR`), and can delete a key automatically after N seconds.

### Key Terms
- **Key / value**: Redis stores strings (and a few other types) under a key, like `user:raehyung:name` → `"raehyung"`.
- **TTL (time to live)**: How long a key survives. `EX 30` means "delete this key 30 seconds after it was set."
- **`ioredis`**: The Node.js client used in this project. A `Redis` instance opens a TCP connection to `localhost:6379` and sends those commands.
- **`REDIS_URL`**: Already validated in `src/config/env.ts` as `redis://localhost:6379`.

---

## 1. Add Redis to Docker Compose

PostgreSQL is already running. Add a second service:

```yaml
  redis:
    image: redis:7-alpine
    container_name: raehyung-redis
    ports:
      - "6379:6379"
```

Start it with the existing Postgres container:

```bash
docker compose up -d
docker compose exec redis redis-cli ping
```

`redis-cli` is the Redis shell inside the container. `PING` returns `PONG` when the server is up.

---

## 2. Connect from Node with `ioredis`

```bash
npm install ioredis
```

`ioredis` is written in TypeScript, so there is no separate `@types/ioredis` package.

```ts
import { Redis } from "ioredis";
import { env } from "./config/env.js";

const redis = new Redis(env.REDIS_URL);

const pong = await redis.ping();
console.log(pong); // "PONG"

await redis.set("steward:hello", "raehyung", "EX", 30);
const value = await redis.get("steward:hello");
const ttl = await redis.ttl("steward:hello");
console.log(value, ttl); // "raehyung"  29  (seconds left)

await redis.quit();
```

`"EX"` is a Redis `SET` option meaning **expire in seconds**. It is not a variable name. `30` is the number of seconds that option applies to.

```ts
await redis.set("steward:hello", "raehyung", "EX", 30);
```

| Argument | Role |
| --- | --- |
| `"steward:hello"` | Key |
| `"raehyung"` | Value stored at that key |
| `"EX"` | The next argument is a TTL counted in **seconds** |
| `30` | Delete this key 30 seconds after the `SET` |

Related `SET` expiry options, same position as `"EX"`:

| Option | Unit of the next number |
| --- | --- |
| `"EX"` | Seconds |
| `"PX"` | Milliseconds |
| `"EXAT"` | Unix timestamp in seconds (expire at that clock time, not "after N seconds") |
| `"PXAT"` | Unix timestamp in milliseconds |

Without `"EX"` / `"PX"`, `SET` keeps the key until something deletes it. Calling `SET` again on the same key replaces the value and, if you pass `"EX"` again, replaces the TTL too.

| Call | What Redis does |
| --- | --- |
| `new Redis(url)` | Opens a TCP connection. Like `pg.Pool`, this does not create keys by itself. |
| `ping()` | Health check. The server answers `PONG`. |
| `set(key, value, "EX", 30)` | Store a string and set a 30-second TTL. |
| `get(key)` | Return the string, or `null` if the key is missing or expired. |
| `ttl(key)` | Seconds remaining. `-2` means the key does not exist. `-1` means it exists with no expiry. |
| `quit()` | Close the connection so a one-off script can exit. |

`SET` and `GET` values are strings. `ioredis` does not turn `"15"` into the number `15`.

---

## Hands-on Test Checklist

- [ ] 1. Add the `redis` service to `docker-compose.yml` and run `docker compose up -d`
- [ ] 2. Confirm the server with `docker compose exec redis redis-cli ping`
- [ ] 3. `npm install ioredis`
- [ ] 4. In a small script or `src/index.ts`, connect with `new Redis(env.REDIS_URL)`, `SET` a key with `EX 30`, then `GET` it and print `TTL`
- [ ] 5. Wait 30 seconds, `GET` the same key, and confirm the result is `null`
- [ ] 6. Call `redis.quit()` and run `npm run typecheck`

> **Next Step Preview**: Once `GET` / `SET` work, the next unit wraps them in the cache-aside pattern: read Redis first, and fill it from PostgreSQL only on a miss. See [[05-Redis/02-cache-aside|02. Cache-Aside Pattern and Cache Invalidation]].
