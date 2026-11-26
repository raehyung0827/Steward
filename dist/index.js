import { eq, sql } from "drizzle-orm"; // for sql query generation
import { db } from "./db/index.js";
import { usageDailyStats, users } from "./db/schema.js";
const [userProfile] = await db.select().from(users).where(eq(users.email, "raehyung@example.com"));
await db
    .insert(usageDailyStats)
    .values({
    userId: userProfile.id,
    startDate: "2026-11-23",
    domain: "youtube.com",
    durationSec: 15,
})
    .onConflictDoUpdate({
    target: [usageDailyStats.userId, usageDailyStats.startDate, usageDailyStats.domain],
    set: {
        durationSec: sql `${usageDailyStats.durationSec} + excluded.duration_sec`,
        updatedAt: new Date(),
    }
});
const wholeDatabase = await db.select();
console.log(wholeDatabase);
