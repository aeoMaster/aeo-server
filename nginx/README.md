# Nginx Configuration (Native - Not Docker)

This directory contains nginx configuration template for the AEO server.

⚠️ **Important**: Nginx runs **natively on EC2**, NOT in Docker!

## Files

- **conf.d/server-api-native.conf** - Production nginx configuration template

## Production Setup (EC2)

### Install/Setup Native Nginx

```bash
# On EC2 server
sudo yum install -y nginx  # Amazon Linux
# or
sudo apt install -y nginx  # Ubuntu

# Enable nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Deploy Nginx Configuration

```bash
# Copy the config to nginx sites
sudo cp nginx/conf.d/server-api-native.conf /etc/nginx/sites-available/server-api

# Create symlink to enable it
sudo ln -sf /etc/nginx/sites-available/server-api /etc/nginx/sites-enabled/server-api

# Remove default config if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Configuration Details

The nginx config proxies to Docker containers exposed on **host ports**:

- **Blue container**: `localhost:5001` → container port 5000
- **Green container**: `localhost:5002` → container port 5000

### Upstream Configuration

```nginx
upstream api_upstream {
    server localhost:5001 max_fails=3 fail_timeout=30s;
    server localhost:5002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

This provides:

- ✅ Load balancing between blue/green deployments
- ✅ Automatic failover if one container is down
- ✅ Health checks with max_fails
- ✅ Connection pooling with keepalive

## SSL/HTTPS Setup

The config expects SSL certificates from Let's Encrypt:

```
/etc/letsencrypt/live/server-api.themoda.io/fullchain.pem
/etc/letsencrypt/live/server-api.themoda.io/privkey.pem
```

To set up SSL:

```bash
# Install certbot
sudo yum install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d server-api.themoda.io
```

## Troubleshooting

### Check Nginx Status

```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

### Check Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Test Backend Connectivity

```bash
# Test containers directly
curl http://localhost:5001/health
curl http://localhost:5002/health

# Test through nginx
curl http://localhost/health
curl https://server-api.themoda.io/health
```

### Reload After Config Changes

```bash
sudo systemctl reload nginx
# or
sudo nginx -s reload
```

## Architecture

```
Internet (80/443)
    ↓
Native Nginx (EC2)
    ↓
localhost:5001 ← Blue Container (Docker)
localhost:5002 ← Green Container (Docker)
```

## Notes

- Nginx runs on the **EC2 host** (not in Docker)
- Docker containers expose ports to the host
- Nginx load balances between both containers
- During deployment, both containers can run simultaneously
- Nginx automatically routes to healthy containers only
