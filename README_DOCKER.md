# 🚀 Quick Start with Docker

## For Developers

### First Time Setup (5 minutes)

```bash
# 1. Clone the repository
git clone <repository-url>
cd aeo-server

# 2. Copy environment file
cp .env.docker.example .env

# 3. Edit .env with your API keys
# Required: OPENAI_API_KEY, COGNITO_*, JWT_SECRET, SESSION_SECRET

# 4. Start everything with one command!
docker-compose up
```

That's it! The application, MongoDB, and Redis will all start automatically.

**Access**:

- API: http://localhost:5000
- Health: http://localhost:5000/health

### Daily Development

```bash
# Start (if stopped)
docker-compose up

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after changes
docker-compose up --build
```

### NPM Scripts

```bash
# Development
npm run docker:dev          # Start all services
npm run docker:dev:build    # Rebuild and start
npm run docker:dev:down     # Stop all services

# Production
npm run docker:prod         # Start production mode
npm run docker:prod:logs    # View production logs
npm run docker:prod:down    # Stop production

# Cleanup
npm run docker:clean        # Remove containers and volumes
```

---

## For DevOps / Production

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- GitHub Actions Runner (self-hosted)

### Production Deployment

1. **Install Docker on EC2**:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
```

2. **Configure GitHub Secrets**:
   Add all environment variables as GitHub repository secrets (see DOCKER_DEPLOYMENT.md)

3. **Deploy**:

```bash
# Automatic: Push to main branch
git push origin main

# Manual: On EC2 instance
docker-compose -f docker-compose.prod.yml up -d
```

### Zero-Downtime Deployment

The system uses **Blue-Green deployment**:

- Two app containers: `app-blue` and `app-green`
- Nginx load balancer distributes traffic
- New deployments update inactive container
- Automatic health checks before switching
- Graceful shutdown of old container

**Benefits**:

- ✅ Zero downtime
- ✅ Instant rollback
- ✅ Health check validation
- ✅ Automatic failover

### Monitoring

```bash
# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app-blue

# Health check
curl http://localhost:5000/health

# Resource usage
docker stats
```

### Troubleshooting

```bash
# View all logs
docker-compose logs -f

# Check specific container
docker logs aeo-server --tail 100

# Restart service
docker-compose restart app

# Clean restart
docker-compose down && docker-compose up -d
```

---

## Architecture

```
Local Development:
┌─────────────────────────────────┐
│   docker-compose up             │
├─────────────────────────────────┤
│  ┌──────────┐                   │
│  │   App    │ :5000             │
│  └────┬─────┘                   │
│       │                         │
│  ┌────▼─────┐  ┌──────────┐    │
│  │ MongoDB  │  │  Redis   │    │
│  └──────────┘  └──────────┘    │
└─────────────────────────────────┘

Production:
┌─────────────────────────────────────┐
│         Nginx :5000                 │
├──────────────┬──────────────────────┤
│  ┌──────────▼┐   ┌─────────────┐   │
│  │ App-Blue  │   │ App-Green   │   │
│  └─────┬─────┘   └──────┬──────┘   │
│        └────────┬────────┘          │
│                 │                   │
│  ┌──────────────▼───┐  ┌────────┐  │
│  │    MongoDB       │  │ Redis  │  │
│  └──────────────────┘  └────────┘  │
└─────────────────────────────────────┘
```

---

## Key Files

- `Dockerfile` - Application container definition
- `docker-compose.yml` - Local development setup
- `docker-compose.prod.yml` - Production setup
- `.env.docker.example` - Environment template
- `nginx.conf` - Load balancer configuration
- `.github/workflows/deploy-docker.yml` - CI/CD pipeline

---

## Need More Info?

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for comprehensive documentation.

---

**No more "works on my machine" problems! 🎉**
