# CampusConnect Setup Guide

## Quick Start

```bash
chmod +x setup.sh
./setup.sh
npm run dev
```

The script:

1. Checks Docker, Docker Compose, and Node.js
2. Creates `.env` from `.env.example` with random JWT secrets
3. Starts PostgreSQL and Redis
4. Installs npm dependencies
5. Runs migrations and seeds sample data

Then open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Manual Setup

### 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0+)
- [Node.js](https://nodejs.org/) 18+

This repo is a single Node app. There are no `backend/` or `frontend/` directories.

### 2. Environment

```bash
cp .env.example .env
```

Set `JWT_SECRET` and `JWT_REFRESH_SECRET`:

```bash
openssl rand -base64 32
```

Local defaults already point at the Docker Postgres and Redis services:

```
DATABASE_URL=postgresql://campusconnect:campusconnect_dev_password@localhost:5432/campusconnect
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

Email (`EMAIL_*`) is optional. Without SMTP, registration can fail after creating the user, and login rejects unverified accounts.

### 3. Databases

```bash
docker compose up -d postgres redis
```

This starts:

- PostgreSQL on port 5432
- Redis on port 6379

Do not run `docker compose up` expecting the web app to start. Compose only runs the databases. The API and Next.js run with `npm run dev`.

### 4. Install, migrate, seed

```bash
npm install
npm run migrate
npm run seed
```

### 5. Run the app

```bash
npm run dev
```

Or in two terminals:

```bash
npm run dev:api
npm run dev:web
```

Confirm the API:

```bash
curl http://localhost:5000/health
```

Should return `{"status":"ok","timestamp":"..."}`.

## Test credentials

After seeding:

- Admin: `admin@campusconnect.com` / `Admin123!`
- Student: `alice@university.edu` / `Student123!`

Verify a registered email:

```bash
docker compose exec postgres psql -U campusconnect -d campusconnect \
  -c "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE email = 'you@example.com';"
```

## What the UI covers

Implemented pages: `/login`, `/register`, `/dashboard`. The dashboard loads suggestions, groups, and events from the API. Buttons such as Messages and My Profile are not wired; those features exist on the API (`/api/...`) but do not have pages yet.

## Common issues

### Docker socket missing (WSL)

If `docker` fails with `Cannot connect to the Docker daemon` or `protocol not available`:

```bash
export DOCKER_HOST=unix:///mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock
```

Start Docker Desktop on Windows first, and enable WSL integration for this distro.

### Port already in use

If ports 3000, 5000, 5432, or 6379 are taken, stop the other process or change the mapping in `docker-compose.yml` / `.env`.

### Database connection failed

```bash
docker compose ps
docker compose logs postgres
docker compose restart postgres
```

`migrate` and `seed` load `.env`. If `DATABASE_URL` is missing you will see a Postgres SASL password error.

### Redis connection failed

```bash
docker compose exec redis redis-cli ping
```

The API will not listen until Redis connects.

### TypeScript / Next.js crash on start

Use TypeScript 5 (`typescript` is pinned in `package.json`). TypeScript 7 is not compatible with Next.js 14.

## Stopping

```bash
# Stop API and Next.js with Ctrl+C

# Stop databases (keeps data)
docker compose stop

# Stop and delete data
docker compose down -v
```

## Database reset

```bash
docker compose down -v
docker compose up -d postgres redis
npm run migrate
npm run seed
```
