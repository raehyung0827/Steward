---
tags: [docker, docker-compose, infra]
status: learning
---

# 01. Docker Compose Basics

← [[00-Index|Back to Index]]

## Why Use Docker Compose?
Installing PostgreSQL, Redis, or RabbitMQ directly on your local machine causes:
- Version mismatches across machines (macOS / Linux / teammates)
- Leftover files and port conflicts when cleaning up or resetting

With a single `docker-compose.yml` blueprint, you can spin up and tear down an identical stack with one command (`docker compose up -d`).

---

## Syntax Breakdown

### 1. `services`
The top-level key listing the containers you want to run. Each key underneath (`postgres`, `redis`) becomes the **service name** and also the **hostname** containers use to talk to each other.

```yaml
services:
  postgres:   # service 1
    ...
  redis:      # service 2
    ...
```

### 2. `image`
Specifies which Docker image to pull and run, using the format `name:tag`.
- `alpine` tags use a minimal Linux base image (much smaller and faster).
- Always pin the major version (e.g., `16-alpine`) instead of `:latest` so updates don't unexpectedly break your setup.

```yaml
services:
  postgres:
    image: postgres:16-alpine
```

### 3. `container_name`
Assigns a fixed, readable name instead of Docker's auto-generated name (e.g., `backend_project-postgres-1`).

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: raehyung-postgres
```

### 4. `ports`
Maps a port on your host machine to a port inside the container.
- Format: `"HOST_PORT:CONTAINER_PORT"`
- Always wrap port mappings in **quotes (`"..."`)** so YAML doesn't misinterpret numbers like `60:60` as base-60 timestamps.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"   # localhost:5432 on your Mac -> port 5432 inside the container
```

### 5. `environment`
Injects **environment variables** into the container on startup.
The official `postgres` image reads these three variables on first boot to initialize the database and user automatically:
- `POSTGRES_USER`: superuser username
- `POSTGRES_PASSWORD`: superuser password (required)
- `POSTGRES_DB`: default database name to create

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: raehyung
      POSTGRES_PASSWORD: raehyung_dev_password
      POSTGRES_DB: raehyung
```

---

## Minimal Working Example (PostgreSQL Only)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: raehyung-postgres
    environment:
      POSTGRES_USER: raehyung
      POSTGRES_PASSWORD: raehyung_dev_password
      POSTGRES_DB: raehyung
    ports:
      - "5432:5432"
```

---

## Essential CLI Commands

| Command | Description |
| --- | --- |
| `docker compose up -d` | Start containers in the background (`-d` = detached) |
| `docker compose ps` | List running containers and their status |
| `docker compose logs -f postgres` | Stream (`-f` = follow) logs from the `postgres` service |
| `docker compose exec postgres psql -U raehyung -d raehyung` | Open an interactive `psql` shell inside the container |
| `docker compose down` | Stop and remove containers |

---

## Hands-on Test Checklist

- [ ] 1. Create a minimal `docker-compose.yml` (PostgreSQL only)
- [ ] 2. Run `docker compose up -d` and verify status with `docker compose ps`
- [ ] 3. Test the connection with `docker compose exec postgres psql -U raehyung -d raehyung -c "SELECT version();"`
- [ ] 4. Tear it down cleanly with `docker compose down`

> **Next Step Preview**: Because this minimal example has no `volumes`, running `docker compose down` **wipes all data** inside the container. We will solve that in [[01-Docker/02-volumes-healthcheck-profiles|02. Volumes, Healthcheck, and Profiles]].
