# 🚨 Server Recovery Guide

## Current Issue

Your server is down after CI/CD deployment. Nginx is running but cannot reach the app containers (error: "Host is unreachable").

## Immediate Recovery Steps (Run on EC2 Server)

### Step 1: Check Container Status

```bash
cd /home/ubuntu/actions-runner/_work/aeo-server/aeo-server
docker ps -a
```

Expected output should show:

- `aeo-nginx` - Running
- `aeo-server-green` or `aeo-server-blue` - May be stopped or unhealthy

### Step 2: Check Container Logs

```bash
# Check logs for the green container
docker logs aeo-server-green --tail 100

# Check logs for the blue container
docker logs aeo-server-blue --tail 100
```

Look for error messages related to:

- Missing environment variables (especially AWS Cognito secrets)
- Database connection failures
- Port binding issues

### Step 3: Restart the Containers

```bash
# Restart both app containers
docker-compose -f docker-compose.prod.yml up -d app-green app-blue

# Wait 10 seconds for startup
sleep 10

# Check container status
docker ps
```

### Step 4: Restart Nginx

```bash
# Restart nginx to reconnect to app containers
docker-compose -f docker-compose.prod.yml restart nginx

# Wait for nginx to stabilize
sleep 5
```

### Step 5: Verify Health

```bash
# Test containers from inside (ports are not exposed to host)
docker exec aeo-server-blue node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
docker exec aeo-server-green node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Test through nginx proxy
curl http://localhost:80/health          # HTTP
curl -k https://localhost:443/health     # HTTPS
```

### Step 6: Check Logs Again

```bash
# Check if containers are now running properly
docker logs aeo-server-green --tail 30
docker logs aeo-nginx --tail 20
```

---

## Root Cause Fixed

I've identified and fixed a **missing environment variable** issue:

### What Was Wrong:

- The `COGNITO_APP_CLIENT_SECRET` variable was not being passed to the Docker containers
- This likely caused the app to crash on startup when trying to initialize Cognito auth

### What I Fixed:

1. ✅ Updated `.github/workflows/deploy-docker.yml` - Fixed env var ordering
2. ✅ Updated `docker-compose.prod.yml` - Added missing client secret variables for both blue and green containers

### Files Changed:

- `.github/workflows/deploy-docker.yml`
- `docker-compose.prod.yml`

---

## Next Deployment

After you've recovered the server using the steps above, **commit and push these fixes**:

```bash
git add .github/workflows/deploy-docker.yml docker-compose.prod.yml
git commit -m "fix: Add missing COGNITO_APP_CLIENT_SECRET env vars to docker-compose"
git push origin features/nir/cognito
```

Then run the GitHub Actions workflow again. The deployment should work correctly now.

---

## Emergency Rollback (If Above Doesn't Work)

If the containers still won't start:

```bash
# Stop everything
docker-compose -f docker-compose.prod.yml down

# Check for any hanging processes
docker ps -a
docker rm -f $(docker ps -aq)  # Remove all containers (BE CAREFUL!)

# Rebuild and restart from scratch
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Verification Checklist

- [ ] Both app containers are running (`docker ps`)
- [ ] Nginx container is running and healthy
- [ ] Containers respond to internal health checks (`docker exec`)
- [ ] Nginx proxy health check works (ports 80/443)
- [ ] Containers have the `api` network alias
- [ ] No error logs in app containers
- [ ] No "Host unreachable" errors in nginx logs

---

## Contact Support

If the server is still down after following these steps, please provide:

1. Output of `docker ps -a`
2. Full logs from `docker logs aeo-server-green --tail 200`
3. Nginx logs from `docker logs aeo-nginx --tail 100`
