# CampusConnect Setup Guide

## Quick Start (Recommended)

The fastest way to get CampusConnect running is using the automated setup script:

### Unix/Linux/macOS

```bash
chmod +x setup.sh
./setup.sh
```

### Windows

```powershell
# Run in PowerShell
.\setup.ps1
```

The script will:
1. Check prerequisites (Docker, Docker Compose)
2. Create environment files with secure random secrets
3. Start all services (PostgreSQL, Redis, Backend, Frontend)
4. Install dependencies
5. Run database migrations
6. Seed sample data

After completion, access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Manual Setup

If you prefer manual setup or the script doesn't work:

### 1. Prerequisites

Install the following:
- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0+)
- [Node.js](https://nodejs.org/) (18+)
- [npm](https://www.npmjs.com/) (9+)

### 2. Clone Repository

```bash
git clone <repository-url>
cd campusconnect
```

### 3. Environment Configuration

#### Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and update:
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate with: `openssl rand -base64 32`
- Email settings (if using email features)
- Google OAuth credentials (if using Google login)

#### Frontend Environment

```bash
cd frontend
cp .env.example .env.local
```

The defaults should work for local development.

### 4. Start Services

```bash
# From project root
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend on port 5000
- Frontend on port 3000

### 5. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 6. Database Setup

```bash
# From backend directory
npm run migrate  # Run migrations
npm run seed     # Seed sample data
```

### 7. Verify Installation

Check that all services are running:

```bash
docker-compose ps
```

Test the API:

```bash
curl http://localhost:5000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### 8. Access Application

Open your browser:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Test Credentials

After seeding, you can login with:

**Admin Account:**
- Email: admin@campusconnect.com
- Password: Admin123!

**Student Account:**
- Email: alice@university.edu
- Password: Student123!

## Development Workflow

### Running in Development Mode

```bash
# Backend (with hot reload)
cd backend
npm run dev

# Frontend (with hot reload)
cd frontend
npm run dev
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Restarting Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

## Common Issues

### Port Already in Use

If ports 3000, 5000, 5432, or 6379 are already in use:

1. Stop the conflicting service, or
2. Change ports in `docker-compose.yml`

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Failed

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Permission Denied (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in for changes to take effect
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Project Structure

```
campusconnect/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Data models
│   │   ├── config/       # Configuration
│   │   ├── database/     # Database scripts
│   │   ├── socket/       # WebSocket handlers
│   │   └── utils/        # Utilities
│   ├── package.json
│   └── Dockerfile
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities
│   │   └── store/        # State management
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml    # Docker orchestration
├── .github/              # CI/CD workflows
└── README.md
```

## Next Steps

1. **Explore the API**: Check `backend/API.md` for all endpoints
2. **Understand the Database**: Review `backend/DATABASE.md` for schema
3. **Customize**: Modify features to fit your needs
4. **Deploy**: Follow `DEPLOYMENT.md` for production deployment

## Getting Help

- **Documentation**: Check the `/docs` folder
- **Issues**: Report bugs on GitHub Issues
- **API Reference**: `backend/API.md`
- **Database Schema**: `backend/DATABASE.md`

## Development Tips

### Hot Reload

Both frontend and backend support hot reload in development mode. Changes are automatically reflected.

### Database Reset

To reset the database:

```bash
docker-compose down -v  # Remove volumes
docker-compose up -d    # Restart services
cd backend
npm run migrate         # Re-run migrations
npm run seed           # Re-seed data
```

### Adding New Dependencies

```bash
# Backend
cd backend
npm install <package-name>

# Frontend
cd frontend
npm install <package-name>
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Production Considerations

Before deploying to production:

1. Change all default passwords and secrets
2. Enable HTTPS/SSL
3. Configure proper CORS settings
4. Set up monitoring and logging
5. Configure automated backups
6. Review security settings
7. Set up CI/CD pipeline

See `DEPLOYMENT.md` for detailed production deployment instructions.

## License

MIT License - See LICENSE file for details

## Support

For questions and support:
- GitHub Issues: <repository-url>/issues
- Email: support@campusconnect.com
- Documentation: <docs-url>
