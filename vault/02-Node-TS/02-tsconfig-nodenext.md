---
tags: [nodejs, typescript, tsconfig]
status: learning
---

# 02. `tsconfig.json` Essentials (`NodeNext`, `strict`)

← [[00-Index|Back to Index]]

## Why Do We Need `tsconfig.json`?
Node.js executes **JavaScript**, not TypeScript.
TypeScript adds static types (`string`, `number`, interfaces) so bugs are caught **before** the server runs. `tsconfig.json` tells the TypeScript compiler (`tsc`) **how to check types** and **how to compile `.ts` files into `.js` files**.

### Key Terms
- **Compile / Transpile (`tsc`)**: Converts `.ts` files in `src/` into plain `.js` files in `dist/` (and checks all types along the way).
- **`tsx`**: A fast dev runner that executes `.ts` files directly in one step without manually running `tsc` first. Great for local development (`npm run dev`), while production runs compiled JS (`node dist/index.js`).
- **`@types/node`**: TypeScript type definitions for Node.js built-in APIs (`process`, `fs`, `crypto`, etc.). Without it, TypeScript doesn't know what `process.env` or `console` types are.

---

## Syntax Breakdown (Core Options)

### 1. `target`
Which version of JavaScript `tsc` outputs. Since we run **Node 22**, we can safely target modern JS (`ES2022`) instead of transpiling down to old syntax.

```json
"target": "ES2022"
```

### 2. `module` & `moduleResolution`
Controls how `import` / `export` statements are resolved and emitted.
For a modern Node.js ESM project (`"type": "module"` in `package.json`), **`"NodeNext"`** is the official standard pair:
- Understands `"type": "module"` in `package.json`
- Enforces Node's real ESM rules (like explicit `.js` extensions on relative imports)

```json
"module": "NodeNext",
"moduleResolution": "NodeNext"
```

### 3. `rootDir` & `outDir`
Separates your source code (`.ts`) from compiled output (`.js`).
- `rootDir`: Where your `.ts` source files live (`src`)
- `outDir`: Where `tsc` writes the compiled `.js` files (`dist`)

```json
"rootDir": "src",
"outDir": "dist"
```

### 4. `strict`
Turns on TypeScript's full suite of safety checks (`noImplicitAny`, `strictNullChecks`, etc.).
- With `"strict": true`, TypeScript forces you to handle `null` / `undefined` and forbids accidental `any` types — preventing the #1 class of runtime crashes in Node.js backends.

```json
"strict": true
```

### 5. `skipLibCheck` & `forceConsistentCasingInFileNames`
- `"skipLibCheck": true`: Skips type-checking `.d.ts` files inside `node_modules/` (makes builds much faster).
- `"forceConsistentCasingInFileNames": true`: Catches macOS-vs-Linux filename case bugs early (`User.ts` vs `user.ts` works on Mac, crashes on Linux servers).

### 6. `include` & `exclude`
Tells `tsc` which folders to compile and which to ignore.

```json
"include": ["src/**/*.ts"],
"exclude": ["node_modules", "dist"]
```

---

## Complete Working `tsconfig.json` (Product Config)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Example `src/index.ts`

```ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet("raehyung"));
```

---

## Core `package.json` Scripts Explained

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "typecheck": "tsc --noEmit",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

| Script | Command | What It Does | When to Use |
| --- | --- | --- | --- |
| `npm run dev` | `tsx watch src/index.ts` | Runs your `.ts` file directly and **watches** for file saves, auto-restarting the server every time you edit code. (Does **not** write files to `dist/` and skips full type-checking for speed.) | Local development while coding |
| `npm run typecheck` | `tsc --noEmit` | Runs TypeScript's full type checker across `src/`, but **`--noEmit`** tells `tsc` *not* to output `.js` files into `dist/`. | Quick safety check before committing or in CI |
| `npm run build` | `tsc` | Checks all types **and** compiles `src/**/*.ts` into plain JavaScript files inside `dist/`. | Before deploying to production |
| `npm start` | `node dist/index.js` | Runs the compiled JavaScript in `dist/` directly with Node.js (fast startup, zero TypeScript/tsx overhead). Note: `start` is a built-in npm shortcut so `npm start` works without `run`. | Running the server in production (or testing the compiled output locally) |

---

## Hands-on Test & Product Build Checklist

- [ ] 1. Remove the temporary test files (`rm greet.js index.js`)
- [ ] 2. Install TypeScript dev tools: `npm install -D typescript tsx @types/node`
- [ ] 3. Create `tsconfig.json` in the project root using the config above
- [ ] 4. Update `package.json` `"scripts"` to add:
  - `"dev": "tsx watch src/index.ts"`
  - `"typecheck": "tsc --noEmit"`
  - `"build": "tsc"`
  - `"start": "node dist/index.js"`
- [ ] 5. Create `src/index.ts` with the typed `greet` function
- [ ] 6. Run `npm run typecheck` (should pass with 0 errors), then `npm run build` and check the generated `dist/index.js`, then run `npm start`
- [ ] 7. **(Experiment)** Pass a number `greet(123)` in `src/index.ts` and run `npm run typecheck` to watch TypeScript catch the bug before running the code! (Then revert it back to `"raehyung"`.)
