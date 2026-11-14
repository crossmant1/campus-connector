# CampusConnect

A student networking platform for universities. The Express API covers auth, matching, groups, events, messages, and notifications. The Next.js UI currently has login, register, and a dashboard.

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL 15
- **Cache/Sessions**: Redis 7
- **Real-time**: Socket.io

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL and Redis)

### Setup

```bash
chmod +x setup.sh
./setup.sh
npm run dev
```

The script copies `.env.example` to `.env`, generates JWT secrets, starts Postgres and Redis, installs dependencies, migrates, and seeds sample users.

Manual equivalent:

```bash
cp .env.example .env
# set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -base64 32)

docker compose up -d postgres redis
npm install
npm run migrate
npm run seed
npm run dev
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health: http://localhost:5000/health

### Test credentials (after seed)

- Admin: `admin@campusconnect.com` / `Admin123!`
- Student: `alice@university.edu` / `Student123!`

New registrations stay unverified until SMTP is configured. To verify a user:

```bash
docker compose exec postgres psql -U campusconnect -d campusconnect \
  -c "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE email = 'you@example.com';"
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API on :5000 and Next.js on :3000 |
| `npm run dev:api` | Express only |
| `npm run dev:web` | Next.js only |
| `npm run migrate` | Apply `src/database/schema.sql` |
| `npm run seed` | Insert sample users and data |

## Project structure

```
campus-connector/
├── src/
│   ├── app/           # Next.js pages (login, register, dashboard)
│   ├── config/        # Postgres and Redis clients
│   ├── controllers/
│   ├── database/      # schema, migrate, seed
│   ├── routes/        # Express API
│   ├── services/
│   ├── socket/        # Socket.io
│   └── server.js      # API entry
├── docker-compose.yml # PostgreSQL + Redis only
├── .env.example
└── setup.sh
```

## Documentation

- [Setup](./SETUP.md)
- [API](./API.md)
- [Database schema](./DATABASE.md)
- [Deployment](./DEPLOYMENT.md)

## License

MIT
