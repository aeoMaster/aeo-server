# 🚨 QUICK FIX - Run These Commands on EC2

## Problem Identified

1. **Trust proxy setting not working** (still getting rate limiting errors)
2. **OAuth state lost between containers** (blue-green deployment issue)
3. **New code may not be deployed** (no OAuth debug logs)

## IMMEDIATE FIXES

### Fix 1: Check if New Code is Deployed

```bash
# Test debug endpoint
curl https://server-api.themoda.io/api/debug/version

# Expected response:
# {"status":"success","deployment":{"hasOAuthDebugLogging":true,"version":"debug-oauth-v1"}}

# If this fails, the new code isn't deployed yet
```

### Fix 2: Check Nginx Configuration

```bash
# Check if sticky sessions are configured
sudo nginx -T | grep -A 5 "upstream api_upstream"

# Should show:
# upstream api_upstream {
#     ip_hash;
#     server localhost:5001 max_fails=3 fail_timeout=30s;
#     server localhost:5002 max_fails=3 fail_timeout=30s;
#     keepalive 32;
# }

# If ip_hash is missing, add it and reload:
sudo nano /etc/nginx/sites-available/server-api.themoda.io
# Add "ip_hash;" inside the upstream block
sudo nginx -t
sudo systemctl reload nginx
```

### Fix 3: Temporary Single-Container Fix

```bash
# Stop one container to force all traffic to the other
docker-compose -f docker-compose.prod.yml stop app-green

# This will make OAuth work immediately (single instance)
# Check which container is still running
docker ps | grep aeo-server

# Test OAuth login now - it should work!
```

### Fix 4: Force Redeploy (if needed)

```bash
# If the new code isn't deployed, force a rebuild
cd /path/to/your/repo

# Check current commit
git log --oneline -1

# If needed, trigger a new deployment
# (This will force Docker to rebuild without cache)
```

## DIAGNOSIS STEPS

### Step 1: Check Current Status

```bash
# Check containers
docker ps | grep aeo-server

# Check nginx config
sudo nginx -T | grep -A 5 "upstream api_upstream"

# Test debug endpoint
curl https://server-api.themoda.io/api/debug/version
```

### Step 2: Check Logs

```bash
# Watch logs from both containers
docker logs -f aeo-server-blue | grep -E "(🔒|🔍|oauth|state)" &
docker logs -f aeo-server-green | grep -E "(🔒|🔍|oauth|state)" &

# Try OAuth login and see if debug logs appear
```

### Step 3: Test OAuth Flow

```bash
# Clear browser cookies
# Navigate to login page
# Watch the logs for OAuth state messages
# Should see: 🔒 [InMemory] Setting state: ...
```

## EXPECTED RESULTS

### If Working Correctly:

```
# Debug endpoint response:
{"status":"success","deployment":{"hasOAuthDebugLogging":true}}

# Nginx config:
upstream api_upstream {
    ip_hash;  # <-- This should be present
    server localhost:5001 max_fails=3 fail_timeout=30s;
    server localhost:5002 max_fails=3 fail_timeout=30s;
}

# OAuth logs:
🔒 [InMemory] Setting state: 004cb429... (expires: 2025-10-15T13:47:38.913Z)
🔍 [InMemory] Getting state: 004cb429... FOUND
```

### If Still Broken:

```
# Debug endpoint: 404 or old response
# Nginx config: No ip_hash
# OAuth logs: No 🔒 or 🔍 emojis
```

## QUICK WIN SOLUTION

**Run this command to fix OAuth immediately:**

```bash
docker-compose -f docker-compose.prod.yml stop app-green
```

This stops one container, forcing all traffic to the remaining container. OAuth will work immediately because there's no load balancing between containers.

**Then you can debug the nginx configuration properly without time pressure.**

---

**The key issue is that your OAuth state is being stored in Container A's memory, but the callback is hitting Container B. Stopping one container eliminates this problem entirely.** 🎯
