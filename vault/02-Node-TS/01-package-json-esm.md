---

## tags: [nodejs, typescript, package-json, esm]
status: learning

# 01. `package.json` and ESM (`"type": "module"`)

← [[00-Index|Back to Index]]

## Why Does This Matter?

Node.js supports **two module systems**:

1. **CommonJS (CJS)** — legacy default (`require()`, `module.exports`)
2. **ECMAScript Modules (ESM)** — modern JS/TS standard (`import`, `export`)

If you don't explicitly configure `"type": "module"` in `package.json`, Node.js treats `.js` files as CommonJS and throws `SyntaxError: Cannot use import statement outside a module`.

---

## Syntax Breakdown

### 1. `"name"`, `"version"`, `"private"`

Basic project metadata. Setting `"private": true` prevents accidentally publishing your backend code to the public npm registry via `npm publish`.

```json
{
  "name": "raehyung-backend",
  "version": "0.1.0",
  "private": true
}
```

#### Key Terms: Registry & How Public Exposure Happens

- **Registry (npm Registry)**: A central online package store (default: `https://registry.npmjs.org`) where JavaScript/TypeScript libraries (`express`, `zod`, etc.) are hosted and downloaded from when you run `npm install`. Think of it like an **App Store for code packages** (similar to Docker Hub for Docker images, or PyPI for Python).
- **How Code Gets Exposed Publicly**:
  1. If a developer (or a misconfigured CI/CD pipeline) runs `npm publish` in a project folder while logged into npm (`npm login`), npm bundles the project files and uploads them to `https://registry.npmjs.org/<package-name>` **publicly by default**.
  2. Anyone on the internet can then run `npm install raehyung-backend` and download your source code (and any accidentally included secrets/configs).
  3. Setting `"private": true` acts as a **hard safety lock**: `npm publish` immediately refuses to run with `ENEEDAUTH / EPRIVATE` before anything leaves your machine.

### 2. `"type": "module"`

Tells Node.js to treat every `.js` (and `.ts` when run with `tsx`) file in this project as an **ES Module**.

```json
{
  "type": "module"
}
```

| Module System            | Import Syntax                | Export Syntax        | File Extension Rule in ESM                                |
| ------------------------ | ---------------------------- | -------------------- | --------------------------------------------------------- |
| CommonJS (default)       | `const x = require("./a")`   | `module.exports = x` | Extension optional                                        |
| ESM (`"type": "module"`) | `import { x } from "./a.js"` | `export const x = 1` | **Explicit** `.js` **extension required** for local files |

> **Common Gotcha**: Even when writing `.ts` files in ESM (`NodeNext`), relative imports use `.js` (e.g., `import { greet } from "./greet.js"`), because TypeScript does not rewrite import paths when compiling `.ts` → `.js`.

### 3. `"scripts"`

Shortcuts you run with `npm run <name>`. npm automatically adds `./node_modules/.bin` to `PATH`, so you can call locally installed tools (`tsc`, `tsx`) without installing them globally.

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

### 4. `"dependencies"` vs `"devDependencies"`

- `dependencies`: Packages needed **at runtime in production** (e.g., `express`, `pg`, `ioredis`, `zod`).
- `devDependencies`: Packages needed **only during development/build** (e.g., `typescript`, `tsx`, `@types/node`, `@types/express`).

Install flags:

```bash
npm install express                 # adds to "dependencies"
npm install -D typescript tsx       # adds to "devDependencies" (-D = --save-dev)
```

### 5. Version Prefixes (`^` vs `~` vs exact)

- `"^5.8.2"`: Allow **minor and patch** updates (`>=5.8.2 <6.0.0`). Default when running `npm install`.
- `"~5.8.2"`: Allow **patch** updates only (`>=5.8.2 <5.9.0`).
- `"5.8.2"`: Lock to exact version.
- `package-lock.json`: Records the exact resolved version tree so every machine installs the exact same bytes.

---

## Minimal Working Example

`package.json`:

```json
{
  "name": "raehyung-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "hello": "node index.js"
  }
}
```

`greet.js`:

```js
export function greet(name) {
  return `Hello, ${name}!`;
}
```

`index.js`:

```js
import { greet } from "./greet.js";

console.log(greet("raehyung"));
```

---

## Hands-on Test Checklist

- [x] 1. Create `package.json` with `"type": "module"`
- [x] 2. Create `greet.js` and `index.js` using `export` / `import` (with `.js` extension)
- [ ] 3. Run `npm run hello` and verify it prints `Hello, raehyung!`
- [ ] 4. **(Experiment)** Remove `.js` from `import { greet } from "./greet"` and run `npm run hello` to see Node's `ERR_MODULE_NOT_FOUND` error firsthand
- [ ] 5. Clean up `greet.js` and `index.js` before moving to [[02-Node-TS/02-tsconfig-nodenext|02. tsconfig.json Essentials]]
