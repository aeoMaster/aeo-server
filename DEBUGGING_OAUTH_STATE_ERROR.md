# 🔍 Debugging OAuth State Error

## Current Issue

You're still getting: `Callback error: AppError: Invalid or expired state parameter`

This means the OAuth state is not being found when the callback is processed.

## 🚨 IMMEDIATE DIAGNOSIS STEPS

### Step 1: Deploy the Debug Version

```bash
git add .
git commit -m "Add OAuth state debug logging"
git push origin main
# Wait for deployment to complete
```

### Step 2: SSH into EC2 and Run Diagnostic Scripts

```bash
# SSH into your EC2 instance
ssh your-ec2-instance

# Copy and run the diagnostic script
cd /path/to/your/repo
./scripts/verify-nginx-config.sh
./scripts/debug-oauth-issue.sh
```

### Step 3: Check the Logs During OAuth Flow

```bash
# Watch logs in real-time from both containers
docker logs -f aeo-server-blue &
docker logs -f aeo-server-green &

# Now try the OAuth login and watch for these debug messages:
# 🔒 [InMemory] Setting state: 700549c3...
# 🔍 [InMemory] Getting state: 700549c3... FOUND/NOT FOUND
```

## 🔍 What to Look For

### If you see "FOUND" in logs:

- The state is being retrieved correctly
- The issue might be with expiration time
- Check if the timestamps show the state is expired

### If you see "NOT FOUND" in logs:

- The state is not in memory = sticky sessions not working
- OR the state was stored in a different container

### If you see no OAuth debug logs at all:

- The new code hasn't been deployed yet
- Check which container is actually receiving the requests

## 🛠️ COMMON FIXES

### Fix 1: Reload Nginx (Most Common)

```bash
# On EC2
sudo systemctl reload nginx

# Verify it worked
sudo nginx -T | grep -A 5 "upstream api_upstream"
# Should show: ip_hash;
```

### Fix 2: Check Nginx Config File Location

The nginx config might be in a different location:

```bash
# Check these locations:
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/conf.d/
ls -la /etc/nginx/sites-enabled/

# Find the right config file
find /etc/nginx -name "*themoda*" -o -name "*server-api*"
```

### Fix 3: Manual Nginx Config Update

If the config file doesn't have `ip_hash`:

```bash
# Edit the nginx config
sudo nano /etc/nginx/sites-available/server-api.themoda.io
# OR
sudo nano /etc/nginx/conf.d/server-api-native.conf

# Add this line inside the upstream block:
upstream api_upstream {
    ip_hash;  # <-- Add this line
    server localhost:5001 max_fails=3 fail_timeout=30s;
    server localhost:5002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Fix 4: Enable Redis (Nuclear Option)

If sticky sessions still don't work:

```bash
# 1. Uncomment Redis in docker-compose.prod.yml
# 2. Add REDIS_URL to GitHub secrets: redis://redis:6379
# 3. Uncomment REDIS_URL in deployment workflow
# 4. Redeploy
```

## 🧪 TESTING STICKY SESSIONS

### Test 1: Multiple Requests from Same IP

```bash
# Make several requests and check which container responds
for i in {1..5}; do
  echo "Request $i:"
  curl -I https://server-api.themoda.io/health
  echo "---"
done

# If sticky sessions work, all requests should hit the same container
```

### Test 2: Check Container Logs

```bash
# Clear logs first
docker logs aeo-server-blue > /dev/null 2>&1
docker logs aeo-server-green > /dev/null 2>&1

# Make a request
curl https://server-api.themoda.io/health

# Check which container logged the request
echo "Blue container logs:"
docker logs aeo-server-blue --tail 5
echo "Green container logs:"
docker logs aeo-server-green --tail 5
```

## 📊 EXPECTED LOG OUTPUT

### With Debug Logging (Working):

```
🔒 [InMemory] Setting state: 700549c3... (expires: 2025-10-15T12:51:34.289Z)
🔒 [InMemory] State stored. Total states: 1
...
🔍 [InMemory] Getting state: 700549c3... FOUND
🔍 [InMemory] State expires: 2025-10-15T12:51:34.289Z, now: 2025-10-15T12:41:34.289Z
```

### With Debug Logging (Broken):

```
🔒 [InMemory] Setting state: 700549c3... (expires: 2025-10-15T12:51:34.289Z)
🔒 [InMemory] State stored. Total states: 1
...
🔍 [InMemory] Getting state: 700549c3... NOT FOUND
🔍 [InMemory] Total states in memory: 0
```

## 🚀 QUICK FIX COMMANDS

```bash
# 1. Deploy debug version
git add . && git commit -m "Debug OAuth state" && git push

# 2. SSH to EC2
ssh your-ec2

# 3. Reload nginx
sudo systemctl reload nginx

# 4. Test
curl https://server-api.themoda.io/health

# 5. Try OAuth login and watch logs
docker logs -f aeo-server-blue | grep -E "(oauth|state|🔒|🔍)"
```

## 🆘 EMERGENCY FALLBACK

If nothing works, temporarily disable one container:

```bash
# Stop one container to force all traffic to the other
docker-compose -f docker-compose.prod.yml stop app-green

# This will make OAuth work immediately (single instance)
# Then you can debug the nginx config properly
```

## 📞 NEXT STEPS

1. **Deploy the debug version** - This will show exactly what's happening
2. **Run the diagnostic scripts** - They'll tell you what's wrong
3. **Check the logs during OAuth flow** - Look for the debug messages
4. **Apply the appropriate fix** - Based on what the logs show

The debug logging will tell us exactly what's happening with the OAuth state storage and retrieval.

---

**Remember**: The OAuth state error means the state is not found when the callback is processed. This is almost always because:

1. Sticky sessions aren't working (nginx config issue)
2. The state expired (timing issue)
3. The state was stored in a different container (load balancing issue)

The debug logs will show us which one it is! 🎯
