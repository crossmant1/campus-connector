#!/bin/bash

# CampusConnect Setup Script
# Starts Postgres and Redis, installs dependencies, migrates, and seeds.

set -e

echo "========================================="
echo "  CampusConnect Setup Script"
echo "========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

# WSL + Docker Desktop often has no /var/run/docker.sock
if [ ! -S /var/run/docker.sock ] && [ -S /mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock ]; then
    export DOCKER_HOST=unix:///mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock
    echo -e "${YELLOW}Using Docker Desktop socket in WSL${NC}"
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Docker, Compose, and Node.js are available${NC}"
echo ""

echo "Setting up environment files..."

if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env

    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|change-me-jwt-secret|$JWT_SECRET|" .env
        sed -i '' "s|change-me-jwt-refresh-secret|$JWT_REFRESH_SECRET|" .env
    else
        sed -i "s|change-me-jwt-secret|$JWT_SECRET|" .env
        sed -i "s|change-me-jwt-refresh-secret|$JWT_REFRESH_SECRET|" .env
    fi

    echo -e "${GREEN}✓ .env created with random JWT secrets${NC}"
else
    echo -e "${YELLOW}.env already exists, skipping...${NC}"
fi

mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"
echo ""

echo "Starting PostgreSQL and Redis..."
$COMPOSE up -d postgres redis

echo ""
echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if $COMPOSE exec -T postgres pg_isready -U campusconnect >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}Error: PostgreSQL did not become ready${NC}"
        $COMPOSE ps
        exit 1
    fi
    sleep 1
done

echo "Waiting for Redis..."
for i in $(seq 1 30); do
    if $COMPOSE exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is ready${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}Error: Redis did not become ready${NC}"
        $COMPOSE ps
        exit 1
    fi
    sleep 1
done

echo ""
echo "Installing npm dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo "Running database migrations..."
npm run migrate
echo -e "${GREEN}✓ Database migrations completed${NC}"
echo ""

echo "Seeding database with sample data..."
npm run seed
echo -e "${GREEN}✓ Database seeded successfully${NC}"
echo ""

echo "========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Start the app (API + Next.js):"
echo "  npm run dev"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:5000"
echo "  API Health: http://localhost:5000/health"
echo ""
echo "Test Credentials:"
echo "  Admin: admin@campusconnect.com / Admin123!"
echo "  Student: alice@university.edu / Student123!"
echo ""
echo "Useful commands:"
echo "  API only: npm run dev:api"
echo "  Frontend only: npm run dev:web"
echo "  Stop databases: $COMPOSE stop"
echo "  View DB logs: $COMPOSE logs -f"
echo ""
