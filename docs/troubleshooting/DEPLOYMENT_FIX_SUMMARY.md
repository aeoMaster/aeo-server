# 🔧 Deployment Fix Summary

## Problem Overview

Your server went down after CI/CD deployment due to **three configuration issues**:

1. **Missing network alias**: `app-green` container lacked the `api` alias that nginx requires
2. **Wrong health checks**: Workflow tested `localhost:5001/5002` but ports were removed
3. **Missing nginx directory**: docker-compose mounted `./nginx/conf.d` but directory didn't exist
4. **Missing env var**: `COGNITO_APP_CLIENT_SECRET` wasn't passed to containers

---

## ✅ All Fixes Applied

### 1. docker-compose.prod.yml

```yaml
# BEFORE (green container)
networks:
  - aeo-network

# AFTER (green container)
networks:
  aeo-network:
    aliases: ["api"]  # ✅ Added - nginx needs this!
```

**Also added:**

- `AWS_COGNITO_CLIENT_SECRET` environment variable
- `COGNITO_APP_CLIENT_SECRET` environment variable
- Both blue and green containers now have the `api` alias

### 2. .github/workflows/deploy-docker.yml

```yaml
# BEFORE
curl -f http://localhost:5001/health  # ❌ Port not exposed

# AFTER
docker exec aeo-server-$COLOR node -e "..."  # ✅ Test inside container
curl -f http://localhost:80/health           # ✅ Test through nginx
```

### 3. Created nginx/ Directory Structure

```
nginx/
├── .gitignore                        # Ignore production-specific configs
├── README.md                         # Documentation
└── conf.d/
    ├── default.conf                  # Default HTTP config
    └── server-api.conf.example       # Production template
```

---

## 📋 Action Items

### **STEP 1: Commit and Push** (Local)

```bash
git add .
git commit -m "fix: Add api alias to green container, update health checks, and create nginx config structure"
git push origin features/nir/cognito
```

### **STEP 2: Fix the Server** (EC2)

SSH to your EC2 server and run:

```bash
# Navigate to project
cd /home/ubuntu/actions-runner/_work/aeo-server/aeo-server

# Pull fixes
git pull origin features/nir/cognito

# Create nginx directory
mkdir -p nginx/conf.d

# Copy production nginx config
cat > nginx/conf.d/server-api.conf << 'EOF'
resolver 127.0.0.11 ipv6=off valid=30s;

upstream api_upstream {
    zone api_zone 64k;
    server api:5000 resolve;
    keepalive 32;
}

server {
    listen 80;
    server_name server-api.themoda.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name server-api.themoda.io;

    ssl_certificate     /etc/letsencrypt/live/server-api.themoda.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/server-api.themoda.io/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    proxy_connect_timeout 3s;
    proxy_send_timeout    60s;
    proxy_read_timeout    60s;
    proxy_next_upstream error timeout http_502 http_503 http_504;

    location / {
        proxy_pass http://api_upstream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health {
        proxy_pass http://api_upstream/health;
    }
}
EOF

# Restart everything
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Wait for startup
sleep 15

# Verify
docker ps
curl http://localhost/health
curl https://server-api.themoda.io/health
```

### **STEP 3: Verify** (EC2)

```bash
# All containers should be running
docker ps

# Should see: aeo-nginx, aeo-server-blue OR aeo-server-green

# Test nginx can reach api
docker exec aeo-nginx wget -qO- http://api:5000/health

# Test from outside
curl https://server-api.themoda.io/health
# Expected: {"status":"ok"}
```

### **STEP 4: Test CI/CD**

Run the GitHub Actions workflow again. It should now succeed with:

- ✅ Container builds successfully
- ✅ Health checks pass (inside container)
- ✅ Nginx health checks pass (ports 80/443)
- ✅ Deployment completes without rollback

---

## 🎯 Key Learnings

### Network Aliases Are Critical

When using Docker networks with custom names, **both blue and green** containers need the **same alias** so nginx can find whichever one is running:

```yaml
networks:
  aeo-network:
    aliases: ["api"] # ✅ Same alias for both colors
```

### Health Checks Must Match Exposed Ports

If you remove port mappings and use only `expose`, health checks must run **inside containers**:

```bash
# ❌ WRONG (when ports not mapped)
curl http://localhost:5001/health

# ✅ RIGHT (when using expose only)
docker exec container-name curl http://localhost:5000/health
```

### Nginx Config Directory Structure

Docker-compose expects the nginx config in a specific location:

```yaml
volumes:
  - ./nginx/conf.d:/etc/nginx/conf.d:ro
```

Make sure this directory exists with at least one `.conf` file!

---

## 📚 Reference Documents

- **QUICK_FIX.md** - Step-by-step recovery commands
- **RECOVERY_GUIDE.md** - Comprehensive troubleshooting guide
- **nginx/README.md** - Nginx configuration documentation

---

## 🆘 Still Having Issues?

If the server is still down, provide:

```bash
# Get diagnostics
docker ps -a
docker logs aeo-server-blue --tail 100 2>/dev/null || echo "Blue not running"
docker logs aeo-server-green --tail 100 2>/dev/null || echo "Green not running"
docker logs aeo-nginx --tail 100
docker network inspect aeo-server_aeo-network
```

Share these outputs for further debugging.

---

## ✨ Summary

**Problems Fixed:**

- ✅ Added `api` network alias to green container
- ✅ Updated workflow health checks for network-only setup
- ✅ Created nginx configuration directory structure
- ✅ Added missing Cognito client secret env vars
- ✅ Updated all documentation

**Next Steps:**

1. Commit and push changes
2. Run fix commands on EC2
3. Verify server is up
4. Test CI/CD deployment

Your server should now deploy successfully with zero downtime! 🚀
