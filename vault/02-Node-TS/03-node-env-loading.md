---
tags: [nodejs, env, security, config]
status: learning
---

# 03. Node 22 Built-in `.env` Loading (`process.loadEnvFile`)

← [[00-Index|Back to Index]]

## Why Do We Use `.env` Files?
Backend servers need sensitive configuration that changes per environment (local Mac vs production server):
- Database password (`DATABASE_URL`)
- JWT signing secret (`JWT_SECRET`)
- Port number (`PORT`)

**Never hardcode secrets in your source code.** If you push them to GitHub, bots scrape leaked keys in seconds. Instead, store them in a local `.env` file (excluded from Git) and load them into `process.env` at startup.

### Key Terms
- **Environment Variable (`process.env`)**: Key-value pairs injected by the OS into a running program. In Node.js, **every value in `process.env` is `string | undefined`** (even numbers like `PORT=3000` come in as `"3000"`).
- **`.env`**: Local-only file holding real secrets for your machine. **Always listed in `.gitignore`** so Git never commits it.
- **`.env.example`**: A safe template committed to Git with fake/placeholder values so teammates (or future you) know which keys are required.
- **`process.loadEnvFile()`**: Built into Node.js (v20.12+ / v22+). Reads `.env` and populates `process.env` directly — **no external `dotenv` package needed!**

---

## Syntax Breakdown

### 1. `.env` File Format
Simple `KEY=VALUE` lines. Lines starting with `#` are comments.

```dotenv
# Server config
PORT=3000
APP_NAME=raehyung-backend
DATABASE_URL=postgres://raehyung:raehyung_dev_password@localhost:5432/raehyung
```

### 2. Loading `.env` with `process.loadEnvFile()`
By default, `process.loadEnvFile()` looks for `.env` in the current working directory.

```ts
// Loads .env into process.env
process.loadEnvFile();

console.log(process.env.PORT);      // "3000" (string!)
console.log(process.env.APP_NAME);  // "raehyung-backend"
```

### 3. Why Wrap It in `try / catch`?
In production (AWS, Fly.io, Railway, Docker), there is usually **no `.env` file on disk** — the hosting platform injects environment variables directly into the OS.
If `.env` doesn't exist, `process.loadEnvFile()` throws an `ENOENT` error. Wrapping it in `try / catch` makes it work in **both** local development and production:

```ts
try {
  process.loadEnvFile();
} catch {
  // No .env file found — assume env vars are already injected by the OS/container
}
```

### 4. Precedence Rule (Important!)
`process.loadEnvFile()` **does NOT overwrite** environment variables that are already set in your shell/OS.
For example, if `.env` says `PORT=3000` and you run:

```bash
PORT=4000 npm run dev
```

`process.env.PORT` will be `"4000"` (the explicit shell value wins).

### 5. Protecting `.env` with `.gitignore`
Always add `.env`, `node_modules/`, and `dist/` to `.gitignore`:

```gitignore
node_modules/
dist/
.env
*.log
.DS_Store
```

---

## Minimal Working Example

`.env`:
```dotenv
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://raehyung:raehyung_dev_password@localhost:5432/raehyung
REDIS_URL=redis://localhost:6379
JWT_SECRET=raehyung-dev-secret-change-in-production-32chars
```

`src/index.ts`:
```ts
try {
  process.loadEnvFile();
} catch {
  // Production environments inject env vars directly
}

console.log("PORT:", process.env.PORT, "| typeof:", typeof process.env.PORT);
console.log("DB:", process.env.DATABASE_URL);
```

---

## Hands-on Test & Product Build Checklist

- [ ] 1. Create `.gitignore` in the project root (`node_modules/`, `dist/`, `.env`, `*.log`, `.DS_Store`)
- [ ] 2. Create `.env` and `.env.example` in the project root (with the 5 keys above; use dummy placeholders in `.env.example`)
- [ ] 3. Update `src/index.ts` to call `process.loadEnvFile()` and print `process.env.PORT` and its `typeof`
- [ ] 4. Run `npm run dev` — notice `typeof process.env.PORT` is **`"string"`**, NOT `"number"`!
- [ ] 5. **(Experiment)** Run `PORT=4000 npm run dev` to verify the shell value overrides `.env`

> **Next Step Preview**: Notice two problems with raw `process.env`:
> 1. `PORT` is a `"string"`, not a `number`.
> 2. If someone forgets `JWT_SECRET`, `process.env.JWT_SECRET` is silently `undefined` until the app crashes later.
>
> We will solve both cleanly in [[03-Validation/01-zod-basics|03-01. Zod Basics]]!
