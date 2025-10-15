# OAuth State Management Fix for Multi-Instance Deployments

## Problem

**Error**: `Invalid or expired state parameter` during OAuth callback

### Root Cause

The OAuth authentication flow was using **in-memory storage** (JavaScript `Map` objects) to store OAuth state and PKCE parameters. This created a critical issue in blue-green deployments:

1. User initiates login → routed to Container A (e.g., blue)
2. OAuth state stored in Container A's memory
3. User redirected to Cognito → authenticates
4. User returns to callback → routed to Container B (e.g., green)
5. **Container B has no knowledge of the state** → Error thrown

## Solutions Implemented

### Solution 1: Sticky Sessions (Immediate Fix) ✅

**File**: `nginx/conf.d/server-api-native.conf`

Added `ip_hash` to the nginx upstream configuration to ensure the same client always hits the same container:

```nginx
upstream api_upstream {
    # Use ip_hash for sticky sessions (same client IP goes to same container)
    ip_hash;
    server localhost:5001 max_fails=3 fail_timeout=30s;
    server localhost:5002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

**Action Required**:

```bash
# On EC2 instance after deployment
sudo systemctl reload nginx
```

**Pros**:

- ✅ Immediate fix, no code changes needed
- ✅ Works with existing infrastructure

**Cons**:

- ⚠️ Clients behind the same NAT/proxy always hit the same container
- ⚠️ Uneven load distribution for some network topologies
- ⚠️ State still lost if container crashes during OAuth flow

---

### Solution 2: Centralized State Service (Proper Fix) ✅

**Files**:

- `src/services/oauthStateService.ts` (new)
- `src/routes/cognitoAuth.ts` (updated)

Created a unified OAuth state service that automatically switches between in-memory and Redis based on configuration:

```typescript
// Automatically uses Redis in production if REDIS_URL is set
import { oauthStateService } from "../services/oauthStateService";

// Store state
await oauthStateService.setState(state, { expiresAt });

// Retrieve state
const stateData = await oauthStateService.getState(state);

// Delete state
await oauthStateService.deleteState(state);
```

**Behavior**:

- **Production** (with `REDIS_URL`): Uses Redis for shared state across all instances
- **Development** (no Redis): Falls back to in-memory storage

**Pros**:

- ✅ True multi-instance support
- ✅ State survives container restarts/crashes
- ✅ Automatic fallback for development
- ✅ Even load distribution

**Cons**:

- ⚠️ Requires Redis infrastructure

---

## Enabling Redis (Recommended)

### 1. Uncomment Redis in docker-compose.prod.yml

```yaml
# Redis Cache (Production)
redis:
  image: redis:7-alpine
  container_name: aeo-redis-prod
  restart: unless-stopped
  networks:
    - app-network
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 3s
    retries: 3
    start_period: 10s
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 2. Add to volumes section

```yaml
volumes:
  redis_data:
```

### 3. Update GitHub Actions workflow

In `.github/workflows/deploy-docker.yml`:

```bash
# Uncomment this line
REDIS_URL=${{ secrets.REDIS_URL }}
```

### 4. Add GitHub Secret

```bash
REDIS_URL=redis://aeo-redis-prod:6379/0
```

### 5. Install Redis client

```bash
npm install redis
```

---

## Testing

### Test Sticky Sessions

```bash
# From your local machine, test multiple requests
for i in {1..10}; do
  curl -I https://server-api.themoda.io/health
done

# Check logs to verify same container handles requests from same IP
```

### Test OAuth Flow

1. Clear browser cookies
2. Navigate to login
3. Authenticate with Cognito
4. Verify successful redirect without state errors

### Test Redis (after enabled)

```bash
# SSH into EC2
docker exec -it aeo-redis-prod redis-cli

# Check keys
KEYS oauth:*

# Should see state and PKCE keys during active OAuth flows
```

---

## Monitoring

### Check which solution is active

```bash
# In application logs, you'll see:
# Sticky sessions (current):
"⚠️  Using in-memory OAuth state management (single instance only)"

# With Redis:
"✅ Redis connected for OAuth state management"
```

### Verify nginx sticky sessions

```bash
sudo nginx -T | grep -A 10 "upstream api_upstream"
```

---

## Migration Timeline

### Phase 1 (Current): Sticky Sessions ✅

- **Status**: Implemented
- **Action**: Reload nginx on EC2
- **Risk**: Low (temporary fix)

### Phase 2 (Recommended): Enable Redis

- **Timeline**: Next deployment window
- **Action**: Follow "Enabling Redis" steps above
- **Risk**: Low (backward compatible, automatic fallback)

### Phase 3: Monitor and Optimize

- **Action**: Monitor Redis memory usage and OAuth success rates
- **Optimization**: Adjust TTL, maxmemory, and eviction policy as needed

---

## Rollback

If issues occur:

### Rollback Sticky Sessions

```bash
# Remove ip_hash from nginx config
sudo vi /etc/nginx/sites-available/server-api.themoda.io
# Remove "ip_hash;" line
sudo systemctl reload nginx
```

### Rollback Redis

```bash
# Remove REDIS_URL from .env
# Service automatically falls back to in-memory storage
# No code changes needed
```

---

## Related Files

- `src/services/oauthStateService.ts` - State management service
- `src/routes/cognitoAuth.ts` - OAuth routes using the service
- `nginx/conf.d/server-api-native.conf` - Nginx configuration with sticky sessions
- `docker-compose.prod.yml` - Redis service configuration

---

## Additional Notes

### Why not use signed JWT state?

We could encode the state into a signed JWT that doesn't require server-side storage. However:

- PKCE code verifier still requires storage
- More complex implementation
- Higher security risk if JWT secret is compromised
- Current solution (Redis) is industry standard

### Why not use sessions?

Express sessions with Redis would work but:

- Adds session middleware overhead to all requests
- OAuth state is short-lived (10 minutes), sessions are longer
- Dedicated OAuth state service is more focused and performant

---

## Questions?

Contact: DevOps team
Updated: October 15, 2025
