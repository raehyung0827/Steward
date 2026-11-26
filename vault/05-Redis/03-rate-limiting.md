---
tags: [redis, rate-limit, incr, steward]
status: learning
---

# 03. Rate Limiting with Redis

← [[00-Index|Back to Index]]

## Why This Is Not a Cache
A cache stores a copy of a PostgreSQL row. A rate limit stores a counter that exists only in Redis.

Steward's extension can send a heartbeat every 15 seconds. A broken client might send hundreds per second. The limit rejects the extra calls before they become PostgreSQL upserts.

This unit uses a **fixed window**: at most 5 requests per 10 seconds for one user. When the window expires, the counter disappears and the user gets 5 new requests.

### Key Terms
- **`INCR key`**: Atomically adds 1 to an integer stored at `key`. If the key is missing, Redis creates it and sets it to `1`. The new value is returned.
- **Atomic**: Two overlapping `INCR` calls cannot both read `4` and both write `5`. Each call sees the result of the previous one.
- **Fixed window**: The counter lives for a fixed TTL (here, 10 seconds) measured from the first request in that window.
- **`EXPIRE key seconds`**: Sets a TTL on an existing key. It does not change the value.

---

## The Counter Key
One key per user. The value is the count, not JSON.

```text
steward:ratelimit:1088b241-9dae-4c9e-b402-a139da78d4c8
```

`INCR` only works cleanly when the value is an integer Redis stored itself. Do not `SET` a JSON string at this key.

---

## Allow 5 Requests, Then Block

```ts
import { Redis } from "ioredis";
import { env } from "./config/env.js";

const redis = new Redis(env.REDIS_URL);
const userId = "1088b241-9dae-4c9e-b402-a139da78d4c8";
const key = `steward:ratelimit:${userId}`;
const limit = 5;

const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 10);
}

if (count > limit) {
  console.log(count, "blocked");
} else {
  console.log(count, "allowed");
}

await redis.quit();
```

| `count` after `INCR` | What happened |
| --- | --- |
| `1` | First request in this window. `EXPIRE` arms the 10-second timer. |
| `2` … `5` | Still inside the limit. Do not call `EXPIRE` again. |
| `6` and above | Over the limit. The request would return HTTP 429 once Express exists. |

Call `EXPIRE` only when `count === 1`. Calling it on every request resets the 10 seconds, so a client that never pauses never runs out of requests.

---

## Hands-on Test Checklist

- [ ] 1. Run the script six times within 10 seconds. The logs are `1 allowed` through `5 allowed`, then `6 blocked`.
- [ ] 2. Run `docker compose exec redis redis-cli ttl steward:ratelimit:<userId>` and confirm the TTL is greater than `0` and at most `10`.
- [ ] 3. Wait until that TTL hits `-2`, run the script once, and confirm the log is `1 allowed` again.
- [ ] 4. `await redis.quit()` and run `npm run typecheck`.

> **Next Step Preview**: The next chapter stores passwords and device tokens so a request can be tied to a real user before this counter runs. See [[06-Auth-Crypto/01-scrypt-password|06-01. Password Hashing with crypto.scrypt and timingSafeEqual]].
