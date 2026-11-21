---
tags: [plan, architecture, backend, raehyung]
---

# Project Plan — Steward (Digital Discipline & Accountability SaaS)

← [[00-Index|Back to Index]]

## 1. Product Concept
A backend-first SaaS that helps users stay productive, intentional, and privacy-aware online:
- **Lightweight Client**: Chrome Extension (Manifest V3) that tracks two signals and sends only **metadata** (never request bodies or full sensitive URLs):
  1. **Active Time Heartbeats**: Sends the active tab's **domain** every 15–30 seconds.
  2. **Browser Network Traffic (`chrome.webRequest`)**: Tracks per-domain **request count**, **estimated data transferred (bytes)** from `Content-Length`, and **third-party tracker domains** contacted in the background.
- **Core Value**: Visualizes on a dashboard where your internet time and data traffic go, how much third-party tracking happens behind the scenes, blocks distracting/harmful domains via `chrome.declarativeNetRequest` once daily limits are hit, and notifies an **Accountability Partner** (friend/mentor) via Webhook when limits are crossed or tracking stops.
- **Harmful Site Blocking & Accountability Alerts (Planned — details TBD)**: Maintain/apply harmful site blocklists (e.g., adult/gambling/addictive sites) so that when a blocked harmful site is accessed or attempted, the extension blocks it immediately and the backend sends an alert to trusted accountability partners (friends/family/mentors) to help users stay accountable.
- **Future Expansion**: Optional custom DoH (DNS-over-HTTPS) proxy in the backend to support mobile (iOS/Android) without App Store VPN review bottlenecks.

---

## 2. Tech Stack
- **Runtime & Framework**: Node.js (v22) + Express 5 + TypeScript
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Cache & Rate Limiting**: Redis 7 (`ioredis`)
- **Message Queue**: RabbitMQ (introduced in Week 3 for write-burst buffering & async webhooks)
- **Validation**: Zod
- **Infrastructure**: Docker & Docker Compose
- **Load Testing**: k6

---

## 3. Target System Architecture

```text
[Chrome Extension / Web Dashboard]
        |
        v
[API Server: Express 5 + TypeScript]
   |-- Auth: JWT (Access Token) + Hashed Device Token (for Extension)
   |-- Rate Limit: Redis (prevent heartbeat abuse / spikes)
   |
   |-- (Write Path: High-Concurrency Heartbeats)
   |     POST /v1/events/heartbeat
   |        --> [RabbitMQ] --> 202 Accepted immediately
   |                 |
   |                 v
   |           [Aggregation Worker]
   |              |-- Batch Upsert into PostgreSQL (every 5-10s or N events)
   |              '-- Rule violation detected --> [Webhook Queue]
   |                                                    |
   |                                                    v
   |                                             [Webhook Worker]
   |                                             Send to Partner (Discord/Slack)
   |                                             (HMAC signature + Retry + DLQ)
   |
   '-- (Read Path)
         Dashboard stats / Block rules --> [Redis Cache-Aside] --> [PostgreSQL]
```

---

## 4. Core PostgreSQL Schema (6 Tables)
1. `users` — account credentials (`scrypt` password hash), display name, timezone
2. `devices` — extension device name, SHA-256 `token_hash`, `last_heartbeat_at`
3. `usage_daily_stats` — `(user_id, stat_date, domain)` composite unique key + `duration_sec`, `request_count`, `bytes_transferred`, `is_third_party` (optimized for Batch Upsert)
4. `rules` — per-domain daily limit (minutes) & block flag
5. `accountability_partners` — partner name, webhook URL, HMAC signing secret
6. `webhook_deliveries` — delivery payload, HTTP status, attempt count, DLQ tracking

---

## 5. Learning & Build Workflow
For every single feature and tech spec, follow the 3-step loop:
1. **Document**: Write small-unit syntax & examples in this Vault.
2. **Test**: Run small hands-on experiments in the terminal.
3. **Build**: Implement it cleanly in the real backend codebase.

---

## 6. 4-Week Milestones
- **Week 1 — Foundation & Auth**: Docker Compose (Postgres + Redis), Express + TS setup, Drizzle schema, Auth (JWT + Device Token), Rules CRUD.
- **Week 2 — Ingestion (V1) & Caching**: Direct-to-DB Heartbeat API (V1), Dashboard stats API with Redis Cache-Aside, minimal Chrome Extension.
- **Week 3 — System Design Upgrade (V2)**: Run `k6` load test on V1 to expose DB bottleneck → add Redis Rate Limiting + RabbitMQ buffering + Batch Upsert Worker → record Before/After benchmarks (TPS, p95 latency, DB CPU).
- **Week 4 — Webhooks & Live Operation**: Accountability Partner Webhook worker (HMAC signature, exponential backoff, DLQ), deploy live, onboard 5–10 real users.
