---
tags: [moc, backend, raehyung]
---

# Backend Engineering Study Vault

> **Project Blueprint**: [[00-Project-Plan|Project Plan & 4-Week Roadmap]]

> **Workflow (One Small Unit at a Time)**
> 1. **Document**: Break down syntax, concepts, and usage examples in this vault.
> 2. **Test**: Run small commands or scripts directly to verify behavior.
> 3. **Build**: Apply only what you understand into the real product.

---

## 01. Docker & Infrastructure
- [x] [[01-Docker/01-docker-compose-basics|01. Docker Compose Basics (services, image, ports, environment)]]
- [x] [[01-Docker/02-volumes-healthcheck-profiles|02. Docker Compose Volumes, Healthcheck, and Profiles]]

## 02. Node.js & TypeScript Fundamentals
- [x] [[02-Node-TS/01-package-json-esm|01. package.json and ESM ("type": "module")]]
- [x] [[02-Node-TS/02-tsconfig-nodenext|02. tsconfig.json Essentials (NodeNext, strict)]]
- [x] [[02-Node-TS/03-node-env-loading|03. Node 22 Built-in .env Loading (process.loadEnvFile)]]

## 03. Input Validation (Zod)
- [x] [[03-Validation/01-zod-basics|01. Zod Schema Definition, coerce, parse vs safeParse]]

## 04. PostgreSQL & Drizzle ORM
- [x] [[04-Postgres-Drizzle/01-pg-pool|01. pg.Pool Connection Pooling]]
- [x] [[04-Postgres-Drizzle/02-drizzle-pgtable|02. Drizzle pgTable Columns and Foreign Keys (references, onDelete)]]
- [x] [[04-Postgres-Drizzle/03-indexes-and-unique|03. Indexes and Composite Unique Indexes]]
- [x] [[04-Postgres-Drizzle/04-drizzle-kit-push|04. drizzle-kit push and Migrations]]
- [x] [[04-Postgres-Drizzle/05-batch-upsert|05. High-Throughput Writes: INSERT ... ON CONFLICT DO UPDATE]]

## 05. Redis
- [x] [[05-Redis/01-ioredis-basics|01. ioredis Connection and Basic Commands (SET, GET, EX, PING)]]
- [x] [[05-Redis/02-cache-aside|02. Cache-Aside Pattern and Cache Invalidation]]
- [x] [[05-Redis/03-rate-limiting|03. Rate Limiting with Redis]]

## 06. Auth & Cryptography
- [ ] [[06-Auth-Crypto/01-scrypt-password|01. Password Hashing with crypto.scrypt and timingSafeEqual]]
- [ ] [[06-Auth-Crypto/02-sha256-device-token|02. Storing API/Device Tokens Safely with SHA-256]]
- [ ] [[06-Auth-Crypto/03-jwt-basics|03. JWT (sign, verify) and Bearer Auth Middleware]]

## 07. Express 5
- [ ] [[07-Express/01-routing-middleware|01. Express 5 Routing, Middleware, and Automatic Async Error Forwarding]]
- [ ] [[07-Express/02-error-handler-shutdown|02. Centralized Error Handler and Graceful Shutdown]]

## 08. Message Queue (RabbitMQ) & Async Workers
- [ ] [[08-RabbitMQ/01-exchange-queue-ack|01. Exchange, Queue, Ack, and Prefetch]]
- [ ] [[08-RabbitMQ/02-batch-worker-dlq|02. Batch Upsert Worker and Dead Letter Queue (DLQ)]]

## 09. Webhooks & Load Testing
- [ ] [[09-Webhook-LoadTest/01-webhook-hmac-retry|01. Webhook Delivery, HMAC Signatures, and Exponential Backoff]]
- [ ] [[09-Webhook-LoadTest/02-k6-load-test|02. Load Testing with k6 (Before/After Benchmarks)]]
