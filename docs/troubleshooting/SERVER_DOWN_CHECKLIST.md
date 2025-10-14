# ✅ Server Recovery Checklist

## Your Server is Down - Follow These Steps

### Local (Your Computer)

- [ ] **Step 1:** Review the changes I made:
  - `docker-compose.prod.yml` - Added `api` alias to green container
  - `.github/workflows/deploy-docker.yml` - Fixed health checks
  - `nginx/` - Created nginx config directory
- [ ] **Step 2:** Commit and push:
  ```bash
  git add .
  git commit -m "fix: Server deployment issues - add api alias and nginx config"
  git push origin features/nir/cognito
  ```

### EC2 Server (SSH Required)

- [ ] **Step 3:** SSH to your EC2 server:

  ```bash
  ssh ec2-user@your-server-ip
  # or
  ssh ubuntu@your-server-ip
  ```

- [ ] **Step 4:** Navigate to project directory:

  ```bash
  cd /home/ubuntu/actions-runner/_work/aeo-server/aeo-server
  ```

- [ ] **Step 5:** Pull the fixes:

  ```bash
  git pull origin features/nir/cognito
  ```

- [ ] **Step 6:** Create nginx directory:

  ```bash
  mkdir -p nginx/conf.d
  ```

- [ ] **Step 7:** Create nginx config file:

  ```bash
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
  ```

- [ ] **Step 8:** Restart Docker containers:

  ```bash
  docker-compose -f docker-compose.prod.yml down
  docker-compose -f docker-compose.prod.yml up -d
  ```

- [ ] **Step 9:** Wait for startup (15 seconds):

  ```bash
  sleep 15
  ```

- [ ] **Step 10:** Check containers are running:

  ```bash
  docker ps
  ```

  **Expected:** Should see `aeo-nginx` and one of `aeo-server-blue` or `aeo-server-green`

- [ ] **Step 11:** Test health endpoint:
  ```bash
  curl http://localhost/health
  curl https://server-api.themoda.io/health
  ```
  **Expected:** `{"status":"ok"}`

### Verification

- [ ] **Step 12:** Visit in browser:

  - https://server-api.themoda.io/health ✅ Should show `{"status":"ok"}`

- [ ] **Step 13:** Check logs for errors:

  ```bash
  docker logs aeo-nginx --tail 20
  docker logs aeo-server-blue --tail 20 2>/dev/null || docker logs aeo-server-green --tail 20
  ```

  **Expected:** No error messages

- [ ] **Step 14:** Test CI/CD deployment:
  - Go to GitHub Actions
  - Run the workflow again
  - Should complete successfully without rollback

## 🎉 Success!

If all checkboxes are complete, your server is back up and running!

## ❌ Still Not Working?

See detailed guides:

- **QUICK_FIX.md** - Quick recovery steps
- **RECOVERY_GUIDE.md** - Comprehensive troubleshooting
- **DEPLOYMENT_FIX_SUMMARY.md** - What was fixed and why

Or share these diagnostics:

```bash
docker ps -a
docker logs aeo-nginx --tail 50
docker logs aeo-server-green --tail 100
docker network inspect aeo-server_aeo-network
```
