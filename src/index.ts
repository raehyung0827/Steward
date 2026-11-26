import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import { env } from "./config/env.js";
import { db } from "./db/index.js";
import { usageDailyStats, users } from "./db/schema.js"

const redis = new Redis(env.REDIS_URL);
const userId = "1088b241-9dae-4c9e-b402-a139da78d4c8";
const key = `steward:ratelimit:${userId}`;
const limit = 5;

const count = await redis.incr(key);
if (count === 1) {
    await redis.expire(key, 10)
}

if (count > limit) {
    console.log(count, "blocked");
} else {
    console.log(count, "allowd ")
}

await redis.quit();

// import { and, eq, sql } from "drizzle-orm" // for sql query generation
// import { db } from "./db/index.js"
// import { usageDailyStats, users } from "./db/schema.js"
// import { email } from "zod";

// const [userProfile] = await db.select().from(users).where(eq(users.email, "raehyung@example.com"));

// await db
//     .insert(usageDailyStats)
//     .values({
//         userId: userProfile.id,
//         startDate: "2026-11-23",
//         domain: "youtube.com",
//         durationSec: 15,
//     })
//     .onConflictDoUpdate({
//         target: [usageDailyStats.userId, usageDailyStats.startDate, usageDailyStats.domain],
//         set: { //excluded is mentioning durationSec of inserting value
//             durationSec: sql`${usageDailyStats.durationSec} + excluded.duration_sec`,
//             updatedAt: new Date(),
//         }
//     });

// const rows = await db.select().from(usageDailyStats);
// console.log(rows);