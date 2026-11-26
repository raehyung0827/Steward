import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
});

export async function checkDBHeaclth(): Promise<boolean> {
    try {
        await pool.query("SELECT 1");
        return true;
    } catch {
        return false;
    }
}

export const db = drizzle(pool, { schema });