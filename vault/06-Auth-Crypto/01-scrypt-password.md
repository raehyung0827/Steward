---
tags: [auth, crypto, scrypt, password]
status: learning
---

# 01. Password Hashing with `crypto.scrypt` and `timingSafeEqual`

← [[00-Index|Back to Index]]

## What Gets Stored
The `users.password_hash` column stores a hash, never the password `raehyung` typed. A database leak then shows `salt:derivedKey`, which cannot be logged in with.

Node's built-in `node:crypto` provides `scrypt`. No password-hashing package is required.

### Key Terms
- **Hash**: A one-way function. The same password and salt always produce the same key. The key does not reveal the password.
- **Salt**: Random bytes generated per password. The same password for two users produces two different stored strings, so an attacker cannot hash a common password once and match it against every row.
- **`scrypt`**: A password hashing function designed to be slow and memory-heavy. That cost is fine for one login and expensive for guessing millions of passwords.
- **`timingSafeEqual`**: Compares two buffers in a way that does not stop at the first different byte. A plain `===` on the hex strings can leak how much of the guess matched through tiny timing differences.

---

## Hash and Verify

`scrypt` is callback-based. `promisify` turns it into a function you can `await`. The stored format is `saltHex:keyHex`.

```ts
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hexKey] = stored.split(":");
  if (!salt || !hexKey) return false;

  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const keyBuf = Buffer.from(hexKey, "hex");
  if (derived.length !== keyBuf.length) return false;

  return timingSafeEqual(derived, keyBuf);
}
```

| Piece | Role |
| --- | --- |
| `randomBytes(16)` | 16 random bytes, encoded as 32 hex characters. New salt every hash. |
| `scryptAsync(password, salt, 64)` | Derives a 64-byte key from the password and that salt. |
| `salt:key` | One string for the `password_hash` column. Verify splits it back apart. |
| `timingSafeEqual` | True only when the newly derived key matches the stored key byte for byte. |

Verification hashes the typed password again with the **stored salt**, then compares keys. It does not decrypt anything.

---

## Hands-on Test Checklist

- [ ] 1. Put `hashPassword` and `verifyPassword` in `src/lib/password.ts`
- [ ] 2. Hash `"raehyung-secret"` twice and print both strings. They differ, because each call generated a new salt.
- [ ] 3. `verifyPassword("raehyung-secret", hash)` is `true`
- [ ] 4. `verifyPassword("wrong-password", hash)` is `false`
- [ ] 5. Run `npm run typecheck`

> **Next Step Preview**: The Chrome extension does not log in with a password on every heartbeat. The next unit creates a random device token and stores only its SHA-256 hash. See [[06-Auth-Crypto/02-sha256-device-token|02. Storing API/Device Tokens Safely with SHA-256]].
