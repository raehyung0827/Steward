import { z } from "zod";
try {
    process.loadEnvFile();
} catch {
    //
}

const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be  at least 32 characters"),
});

export const env = envSchema.parse(process.env);