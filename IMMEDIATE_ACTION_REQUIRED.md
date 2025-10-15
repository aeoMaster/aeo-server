# ⚠️ IMMEDIATE ACTION REQUIRED - OAuth Fix Deployment

## What Happened

Your OAuth login was failing with "Invalid or expired state parameter" because:

- You're using blue-green deployment (2 containers)
- OAuth state was stored in memory (not shared between containers)
- User could start login on Container A, return on Container B → state not found

## What Was Fixed

### 1. ✅ Nginx Sticky Sessions (Quick Fix)

- **File**: `nginx/conf.d/server-api-native.conf`
- **Change**: Added `ip_hash` to ensure same user hits same container
- **Status**: Code updated, needs deployment

### 2. ✅ OAuth State Service (Proper Fix)

- **Files**: New service `src/services/oauthStateService.ts`
- **Change**: Centralized state management with Redis support
- **Status**: Code ready, Redis optional

### 3. ✅ Removed Unused Import

- **File**: `src/middleware/cognitoAuth.ts`
- **Fixed**: TypeScript compilation error

---

## DEPLOYMENT STEPS

### Step 1: Deploy the Code

```bash
# Commit and push your changes
git add .
git commit -m "Fix OAuth state management for multi-instance deployment"
git push origin main

# Trigger GitHub Actions deployment
# (or manually deploy)
```

### Step 2: Reload Nginx on EC2 ⚠️ CRITICAL

```bash
# SSH into your EC2 instance
ssh your-ec2-instance

# Reload nginx to enable sticky sessions
sudo systemctl reload nginx

# Verify the configuration
sudo nginx -T | grep -A 5 "upstream api_upstream"
# You should see "ip_hash;" in the output
```

### Step 3: Test OAuth Flow

1. Clear your browser cookies for themoda.io
2. Go to login page
3. Authenticate with Cognito
4. Verify successful login without errors

---

## Optional: Enable Redis (Recommended for Production)

Redis provides true multi-instance support. Enable it when ready:

### 1. Install Redis client

```bash
npm install redis
```

### 2. Uncomment Redis in docker-compose.prod.yml

```yaml
redis:
  image: redis:7-alpine
  # ... (uncomment the full section)
```

### 3. Add GitHub Secret

```bash
REDIS_URL=redis://redis:6379
```

### 4. Uncomment in .github/workflows/deploy-docker.yml

```bash
REDIS_URL=${{ secrets.REDIS_URL }}
```

### 5. Deploy

The service automatically uses Redis when `REDIS_URL` is set!

---

## Verify Deployment

### Check Application Logs

```bash
docker logs aeo-server-blue --tail 50
# or
docker logs aeo-server-green --tail 50

# You should see:
# "⚠️  Using in-memory OAuth state management (single instance only)"
# OR (if Redis enabled):
# "✅ Redis connected for OAuth state management"
```

### Check Nginx

```bash
sudo systemctl status nginx
# Should show: active (running)

curl https://server-api.themoda.io/health
# Should return: { "status": "ok", ... }
```

### Test Login

Navigate to your login page and complete the OAuth flow.

---

## Troubleshooting

### If OAuth still fails:

1. Check nginx was actually reloaded: `sudo systemctl reload nginx`
2. Verify both containers are running: `docker ps | grep aeo-server`
3. Check logs for errors: `docker logs aeo-server-[blue/green]`

### If deployment fails:

1. Check TypeScript compilation: `npm run build`
2. Verify no other unused imports
3. Check GitHub Actions logs

### If Redis issues (if enabled):

1. Check Redis is running: `docker ps | grep redis`
2. Test Redis: `docker exec aeo-redis-prod redis-cli ping`
3. Remove `REDIS_URL` to fall back to in-memory (with sticky sessions)

---

## Files Changed

✅ `src/middleware/cognitoAuth.ts` - Removed unused import
✅ `nginx/conf.d/server-api-native.conf` - Added sticky sessions
✅ `src/services/oauthStateService.ts` - New state management service
✅ `src/routes/cognitoAuth.ts` - Updated to use new service
✅ `docs/troubleshooting/OAUTH_STATE_MULTI_INSTANCE_FIX.md` - Full documentation

---

## Summary

**Before**: OAuth state in memory → blue-green deployment = broken login
**After**:

- Sticky sessions (ip_hash) → same user stays on same container
- State service ready for Redis → proper multi-instance support

**Next Deploy**: Verify nginx reload, test login flow
**Optional**: Enable Redis for production-grade state management

---

✅ **YOU'RE READY TO DEPLOY!**

Just remember to reload nginx after deployment.
