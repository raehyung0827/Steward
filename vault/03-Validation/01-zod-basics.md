---
tags: [zod, validation, typescript, config]
status: learning
---

# 01. Zod Basics (`z.object`, `coerce`, `parse` vs `safeParse`)

← [[00-Index|Back to Index]]

## Why Do We Need Zod?
Remember what we just saw in the `.env` experiment:
- `PORT=3asdlkmasdl0` ran without any error, and `typeof process.env.PORT` was `"string"`.
- TypeScript types **disappear at runtime** — they cannot check external data coming from `.env`, HTTP request bodies (`req.body`), or webhooks.

**Zod** is a **runtime schema validation library** that checks untrusted data at the boundary of your server **and** automatically gives you exact TypeScript types for the validated result.

### Key Terms
- **Compile-time vs Runtime**:
  - *Compile-time (TypeScript)*: Checks your own code before it runs (`npm run typecheck`).
  - *Runtime (Zod)*: Checks real incoming data *while* the server is running (`.env`, API JSON, query params).
- **Schema**: A blueprint describing the exact shape and constraints of valid data (e.g., "must be a valid email", "must be a positive integer").
- **Fail-Fast**: Crashing immediately at server startup with a clear error message if required config (like `DATABASE_URL` or `JWT_SECRET`) is missing or malformed — instead of crashing hours later in production.
- **Coercion (`z.coerce`)**: Automatically converting a value to the target type before validating (e.g., `"3000"` → `3000`).

---

## Syntax Breakdown

### 1. Defining a Schema with `z.object()`
Define each field and chain validation rules onto it:

```ts
import { z } from "zod";

const userSchema = z.object({
  username: z.string().min(2).max(30),
  email: z.string().email(),
  role: z.enum(["user", "admin"]).default("user"),
});
```

### 2. Common Validators You'll Use Everywhere
| Method | What It Checks / Does |
| --- | --- |
| `z.string()` | Must be a string |
| `.min(n)` / `.max(n)` | Minimum / maximum length (or value for numbers) |
| `.email()` / `.url()` | Must be a valid email / URL format |
| `z.number().int().positive()` | Must be a positive integer (`1, 2, 3, ...`) |
| `z.coerce.number()` | Converts `"3000"` → `3000` first, then validates as a number (rejects `"3asdlkmasdl0"` as `NaN`) |
| `z.enum(["a", "b"])` | Must be one of the listed exact values |
| `.default(value)` | Used when the input is `undefined` |

### 3. `.parse()` vs `.safeParse()`
- **`.parse(data)`**: Returns the validated, typed data — or **throws a `ZodError`** if invalid.
  - Best for: startup config (`env.ts`) and Express 5 route handlers (where thrown errors go straight to our central error handler).
- **`.safeParse(data)`**: Never throws. Returns `{ success: true, data }` or `{ success: false, error }`.
  - Best for: when you want to handle validation failure manually with an `if` statement.

```ts
// 1. parse() — throws on invalid input
const valid = userSchema.parse({
  username: "raehyung",
  email: "raehyung@example.com",
});
// valid.role === "user" (default applied!)

// 2. safeParse() — returns result object without throwing
const result = userSchema.safeParse({
  username: "r",          // too short!
  email: "not-an-email",
});

if (!result.success) {
  console.log(result.error.flatten().fieldErrors);
}
```

### 4. Extracting a TypeScript Type with `z.infer`
You never have to write both a Zod schema *and* a duplicate `interface` — Zod derives the TS type automatically:

```ts
type UserInput = z.infer<typeof userSchema>;
// Equivalent to: { username: string; email: string; role: "user" | "admin" }
```

---

## Real Product Example: `src/config/env.ts`

```ts
import { z } from "zod";

try {
  process.loadEnvFile();
} catch {
  // Production environments inject env vars directly
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
});

export const env = envSchema.parse(process.env);
```

Now anywhere in the project:
```ts
import { env } from "./config/env.js";

console.log(env.PORT, typeof env.PORT); // 3000 "number"
```

---

## Hands-on Test & Product Build Checklist

- [ ] 1. Install Zod as a runtime dependency: `npm install zod` (notice: **no `-D`**, because Zod runs in production!)
- [ ] 2. Create `src/config/env.ts` using the product example above
- [ ] 3. Update `src/index.ts` to `import { env } from "./config/env.js"` and log `env.PORT` and `typeof env.PORT`
- [ ] 4. **(Experiment — Fail-Fast!)** Keep `PORT=3asdlkmasdl0` in `.env` and run `npm run dev` — watch Zod immediately catch the invalid port and print a clear error!
- [ ] 5. Fix `.env` (`PORT=3000`, plus valid `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` of 32+ chars) and run `npm run dev` again — verify `typeof env.PORT` is now **`"number"`**!
- [ ] 6. Run `npm run typecheck` to confirm 0 errors
