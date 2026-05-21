# CampusConnect

A production-ready student networking platform for universities that connects students across departments to collaborate on projects, form study groups, discover events, and message in real-time.

## Features

- Secure authentication (Email/Password + Google OAuth)
- Intelligent student matching algorithm
- Real-time messaging with WebSockets
- Study group creation and management
- Event discovery system
- Skill-based collaboration matching
- Real-time notifications
- Admin dashboard with analytics

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, ShadCN UI
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Cache/Sessions**: Redis
- **Real-time**: Socket.io
- **Deployment**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:

```bash
# Backend (.env)
cp backend/.env.example backend/.env

# Frontend (.env.local)
cp frontend/.env.example frontend/.env.local
```

4. Start with Docker:

```bash
docker-compose up -d
```

5. Run migrations:

```bash
cd backend
npm run migrate
npm run seed
```

6. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Admin Dashboard: http://localhost:3000/admin

## Project Structure

```
campusconnect/
├── backend/           # Express API server
├── frontend/          # Next.js application
├── docker-compose.yml # Docker orchestration
└── README.md
```

## Documentation

- [API Documentation](./backend/API.md)
- [Database Schema](./backend/DATABASE.md)
- [Deployment Guide](./DEPLOYMENT.md)

## License

MIT
