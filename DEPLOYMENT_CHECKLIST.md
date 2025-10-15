# 🚀 OAuth Fix Deployment Checklist

## Current Status

- ✅ Code is ready (builds successfully)
- ✅ Debug logging added to OAuth state service
- ✅ Express trust proxy setting added
- ✅ Debug routes added for testing
- ❌ **New code not deployed yet** (no debug logs in your output)
- ❌ **Nginx not reloaded** (sticky sessions not active)

## 🚨 IMMEDIATE DEPLOYMENT STEPS

### Step 1: Deploy the New Code

```bash
git add .
git commit -m "Add OAuth debug logging and fix trust proxy setting"
git push origin main
```

### Step 2: Wait for Deployment to Complete

- Check GitHub Actions workflow status
- Wait for "Deployment successful" message
- Should take 3-5 minutes

### Step 3: SSH into EC2 and Reload Nginx ⚠️ CRITICAL

```bash
ssh your-ec2-instance

# Reload nginx to enable sticky sessions
sudo systemctl reload nginx

# Verify it worked
sudo nginx -T | grep -A 5 "upstream api_upstream"
# Should show: ip_hash;
```

### Step 4: Test the Deployment

```bash
# Test if new code is deployed
curl https://server-api.themoda.io/api/debug/version
# Should return: {"status":"success","deployment":{"hasOAuthDebugLogging":true,...}}

# Test trust proxy setting
curl https://server-api.themoda.io/api/debug/trust-proxy
# Should return: {"status":"success","trustProxy":{"enabled":true,...}}
```

### Step 5: Test OAuth Flow

```bash
# Watch logs in real-time
docker logs -f aeo-server-blue | grep -E "(🔒|🔍|oauth|state)" &
docker logs -f aeo-server-green | grep -E "(🔒|🔍|oauth|state)" &

# Now try OAuth login and watch for debug messages
```

## 🔍 What You Should See After Deployment

### Debug Version Endpoint

```bash
curl https://server-api.themoda.io/api/debug/version
```

**Expected Response:**

```json
{
  "status": "success",
  "deployment": {
    "hasOAuthDebugLogging": true,
    "hasTrustProxy": true,
    "version": "debug-oauth-v1"
  }
}
```

### Trust Proxy Endpoint

```bash
curl https://server-api.themoda.io/api/debug/trust-proxy
```

**Expected Response:**

```json
{
  "status": "success",
  "trustProxy": {
    "enabled": true,
    "ip": "172.20.0.1",
    "xForwardedFor": "172.20.0.1"
  }
}
```

### OAuth Debug Logs (During Login)

**When starting login:**

```
🔒 [InMemory] Setting state: 86099deb... (expires: 2025-10-15T12:59:17.259Z)
🔒 [InMemory] State stored. Total states: 1
```

**When callback is processed:**

```
🔍 [InMemory] Getting state: 86099deb... FOUND
🔍 [InMemory] State expires: 2025-10-15T12:59:17.259Z, now: 2025-10-15T12:49:17.259Z
```

## 🚨 TROUBLESHOOTING

### If Debug Endpoints Don't Work

- New code hasn't been deployed yet
- Wait for GitHub Actions to complete
- Check deployment logs

### If Trust Proxy Still Shows Errors

- The setting is in the code but might not be taking effect
- Try restarting the containers:

```bash
docker-compose -f docker-compose.prod.yml restart
```

### If OAuth Still Fails with "NOT FOUND"

- Nginx sticky sessions not working
- Check nginx config: `sudo nginx -T | grep ip_hash`
- If missing, add `ip_hash;` to upstream block and reload

### If No OAuth Debug Logs at All

- New code not deployed
- Check which container is receiving requests
- Verify deployment completed successfully

## 🎯 SUCCESS INDICATORS

1. **Debug endpoints return expected responses** ✅
2. **No more rate limiting errors** ✅
3. **OAuth debug logs appear during login** ✅
4. **OAuth login completes successfully** ✅

## 📞 NEXT STEPS AFTER DEPLOYMENT

1. **Deploy the code** (git push)
2. **Wait for deployment** (3-5 minutes)
3. **Reload nginx** (sudo systemctl reload nginx)
4. **Test debug endpoints** (curl /api/debug/version)
5. **Test OAuth flow** (watch logs, try login)

---

**The key issue is that your current deployment doesn't have the new code yet. Once deployed, the debug logs will show exactly what's happening with the OAuth state!** 🎯
