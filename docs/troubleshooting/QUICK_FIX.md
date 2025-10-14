# 🚨 QUICK FIX - Server Down After CI/CD

## **What Went Wrong:**

1. **Missing network alias**: `app-green` container didn't have the `api` alias that nginx needs
2. **Wrong health checks**: The workflow was testing `localhost:5001` and `localhost:5002`, but you removed those port mappings
3. Your nginx config expects to find containers at `api:5000`, but only blue had that alias

## **✅ IMMEDIATE FIX (Run on EC2 Server NOW):**

```bash
# Navigate to project directory
cd /home/ubuntu/actions-runner/_work/aeo-server/aeo-server

# Pull the latest fixes (after you push them)
git pull origin features/nir/cognito

# Create nginx config directory if it doesn't exist
mkdir -p nginx/conf.d

# Copy your production nginx config to the new location
# (Your existing config is in /etc/nginx/conf.d/server-api.conf or similar)
sudo cp /etc/nginx/conf.d/server-api.conf nginx/conf.d/server-api.conf

# Or use the config you showed me:
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

# Stop everything
docker-compose -f docker-compose.prod.yml down

# Rebuild and start fresh
docker-compose -f docker-compose.prod.yml up -d

# Wait for containers to be healthy
sleep 15

# Check status
docker ps

# Verify it's working
curl http://localhost:80/health
curl -k https://localhost:443/health
```

## **🔍 What I Fixed:**

### 1. **docker-compose.prod.yml**

- ✅ Added `api` network alias to **app-green** container (it was only on blue!)
- ✅ Both blue and green containers now have the `api` alias that nginx expects
- ✅ Added missing `COGNITO_APP_CLIENT_SECRET` environment variables

### 2. **.github/workflows/deploy-docker.yml**

- ✅ Updated health checks to work with network-only containers (no exposed ports)
- ✅ Tests now run inside containers using `docker exec`
- ✅ Tests nginx on ports 80 and 443 instead of 5001/5002

### 3. **RECOVERY_GUIDE.md**

- ✅ Updated all commands to match your new network configuration

---

## **📝 Next Steps:**

1. **Commit and push the fixes:**

   ```bash
   git add docker-compose.prod.yml .github/workflows/deploy-docker.yml RECOVERY_GUIDE.md QUICK_FIX.md
   git commit -m "fix: Add api network alias to green container and update health checks"
   git push origin features/nir/cognito
   ```

2. **Run the quick fix on EC2** (see commands above)

3. **Verify the server is up:**

   - Visit: https://server-api.themoda.io/health
   - Should return: `{"status":"ok"}`

4. **Test the CI/CD again** - It should work now!

---

## **Why This Happened:**

Your nginx config uses an upstream that resolves `api:5000`:

```nginx
upstream api_upstream {
    server api:5000 resolve;
}
```

But when you changed the docker-compose to use network aliases:

- ✅ `app-blue` had: `aliases: ["api"]`
- ❌ `app-green` had: `- aeo-network` (NO alias!)

So when deploying to green, nginx couldn't find it! Both containers need the **same alias** so nginx can route to whichever one is running.

---

## **Verification Commands:**

After the fix, verify everything:

```bash
# Check all containers are running
docker ps

# Check nginx can reach the api
docker exec aeo-nginx wget -qO- http://api:5000/health

# Check from outside
curl http://localhost:80/health
curl https://server-api.themoda.io/health

# Check logs for errors
docker logs aeo-nginx --tail 50
docker logs aeo-server-blue --tail 50 2>/dev/null || echo "Blue not running"
docker logs aeo-server-green --tail 50 2>/dev/null || echo "Green not running"
```

---

## **Emergency Contact:**

If the server is still down after these fixes, provide:

1. Output of `docker ps -a`
2. Output of `docker logs aeo-server-green --tail 100`
3. Output of `docker logs aeo-nginx --tail 100`
4. Output of `docker network inspect aeo-server_aeo-network`
