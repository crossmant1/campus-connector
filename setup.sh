#!/bin/bash

# CampusConnect Setup Script
# This script automates the initial setup of the CampusConnect platform

set -e

echo "========================================="
echo "  CampusConnect Setup Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Create environment files if they don't exist
echo "Setting up environment files..."

if [ ! -f backend/.env ]; then
    echo "Creating backend/.env from example..."
    cp backend/.env.example backend/.env
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    # Update secrets in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" backend/.env
        sed -i '' "s/your-super-secret-refresh-key-change-in-production/$JWT_REFRESH_SECRET/" backend/.env
    else
        # Linux
        sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" backend/.env
        sed -i "s/your-super-secret-refresh-key-change-in-production/$JWT_REFRESH_SECRET/" backend/.env
    fi
    
    echo -e "${GREEN}✓ Backend environment file created${NC}"
else
    echo -e "${YELLOW}Backend .env already exists, skipping...${NC}"
fi

if [ ! -f frontend/.env.local ]; then
    echo "Creating frontend/.env.local from example..."
    cp frontend/.env.example frontend/.env.local
    echo -e "${GREEN}✓ Frontend environment file created${NC}"
else
    echo -e "${YELLOW}Frontend .env.local already exists, skipping...${NC}"
fi

echo ""

# Create logs directory
mkdir -p backend/logs
echo -e "${GREEN}✓ Logs directory created${NC}"
echo ""

# Start Docker containers
echo "Starting Docker containers..."
docker-compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Docker containers are running${NC}"
else
    echo -e "${RED}Error: Some containers failed to start${NC}"
    docker-compose ps
    exit 1
fi

echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
cd ..

echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
cd ..

echo ""

# Run database migrations
echo "Running database migrations..."
cd backend
npm run migrate
echo -e "${GREEN}✓ Database migrations completed${NC}"

echo ""

# Seed database
echo "Seeding database with sample data..."
npm run seed
echo -e "${GREEN}✓ Database seeded successfully${NC}"
cd ..

echo ""
echo "========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Your CampusConnect platform is ready!"
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
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo ""
echo "Documentation:"
echo "  API Docs: backend/API.md"
echo "  Database Schema: backend/DATABASE.md"
echo "  Deployment Guide: DEPLOYMENT.md"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
