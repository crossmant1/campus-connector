# CampusConnect Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)
- Domain name (for production)
- SSL certificate (for production)

## Local Development Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd campusconnect

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend environment
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your configuration
```

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run migrations
cd backend
npm run migrate

# Seed database with sample data
npm run seed
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Test Credentials

After seeding:
- Admin: admin@campusconnect.com / Admin123!
- Student: alice@university.edu / Student123!

## Production Deployment

### Option 1: AWS Deployment

#### Prerequisites
- AWS Account
- AWS CLI configured
- Terraform (optional)

#### Services Used
- EC2 or ECS for application hosting
- RDS PostgreSQL for database
- ElastiCache Redis for caching
- S3 for file storage
- CloudFront for CDN
- Route 53 for DNS
- ALB for load balancing

#### Steps

1. **Database Setup**
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier campusconnect-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username admin \
  --master-user-password <password> \
  --allocated-storage 20

# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id campusconnect-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

2. **Build Docker Images**
```bash
# Build backend
docker build -t campusconnect-backend:latest ./backend

# Build frontend
docker build -t campusconnect-frontend:latest ./frontend

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag campusconnect-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/campusconnect-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/campusconnect-backend:latest
```

3. **Deploy with ECS**
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name campusconnect-cluster

# Create task definitions and services
# (Use provided task-definition.json files)
```

### Option 2: DigitalOcean Deployment

#### Prerequisites
- DigitalOcean Account
- doctl CLI installed

#### Steps

1. **Create Droplet**
```bash
doctl compute droplet create campusconnect \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --region nyc1
```

2. **Setup Server**
```bash
# SSH into droplet
ssh root@<droplet-ip>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install docker-compose-plugin

# Clone repository
git clone <repository-url>
cd campusconnect
```

3. **Configure Environment**
```bash
# Update environment variables
nano backend/.env
nano frontend/.env.local

# Update docker-compose.yml for production
```

4. **Deploy**
```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npm run migrate
```

5. **Setup Nginx Reverse Proxy**
```bash
# Install Nginx
apt-get install nginx

# Configure Nginx
nano /etc/nginx/sites-available/campusconnect
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name campusconnect.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

6. **Setup SSL with Let's Encrypt**
```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d campusconnect.com -d www.campusconnect.com
```

### Option 3: Vercel + Railway

#### Frontend on Vercel

1. **Connect Repository**
- Go to vercel.com
- Import your repository
- Select frontend directory

2. **Configure Build**
```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

3. **Environment Variables**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app
```

#### Backend on Railway

1. **Create New Project**
- Go to railway.app
- Create new project from GitHub

2. **Add Services**
- PostgreSQL database
- Redis cache
- Node.js backend

3. **Configure Environment**
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<generate-secure-secret>
FRONTEND_URL=https://your-vercel-app.vercel.app
```

4. **Deploy**
- Railway auto-deploys on git push
- Run migrations via Railway CLI

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend
          npm install
          npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Add deployment commands
```

## Monitoring and Logging

### Application Monitoring
- Use PM2 for process management
- Setup Winston for structured logging
- Configure log rotation

### Database Monitoring
- Enable PostgreSQL slow query log
- Monitor connection pool usage
- Setup automated backups

### Performance Monitoring
- Use New Relic or DataDog
- Monitor API response times
- Track WebSocket connections

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database encryption
- [ ] Configure firewall rules
- [ ] Setup automated backups
- [ ] Enable audit logging
- [ ] Implement DDoS protection
- [ ] Regular security updates

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (ALB, Nginx)
- Deploy multiple backend instances
- Use Redis for session sharing
- Implement database read replicas

### Vertical Scaling
- Upgrade server resources
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets

## Backup Strategy

### Database Backups
```bash
# Daily automated backup
pg_dump -U campusconnect campusconnect > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U campusconnect campusconnect < backup_20240101.sql
```

### File Backups
- Backup uploaded files to S3
- Implement versioning
- Setup cross-region replication

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Check PostgreSQL status
docker-compose ps postgres
docker-compose logs postgres

# Verify connection string
psql $DATABASE_URL
```

2. **Redis Connection Failed**
```bash
# Check Redis status
docker-compose ps redis
redis-cli ping
```

3. **WebSocket Connection Issues**
```bash
# Check CORS configuration
# Verify WebSocket URL
# Check firewall rules
```

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: <docs-url>
- Email: support@campusconnect.com
