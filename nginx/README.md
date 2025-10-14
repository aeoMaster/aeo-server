# Nginx Configuration

This directory contains nginx configuration files for the AEO server.

## Files

- **conf.d/default.conf** - Default HTTP-only configuration for local/testing
- **conf.d/server-api.conf.example** - Production SSL configuration template

## Local Development

The `default.conf` is used automatically when running docker-compose. It provides basic HTTP proxy to the api containers.

## Production Deployment (EC2)

On your EC2 server, the nginx configuration is located at:

```
/home/ubuntu/actions-runner/_work/aeo-server/aeo-server/nginx/conf.d/
```

### Current Production Config

The production server uses `server-api.conf` (not tracked in git for security) with:

- HTTP to HTTPS redirect
- SSL certificates from Let's Encrypt
- Domain: `server-api.themoda.io`

To update production config:

1. SSH to EC2
2. Edit `/home/ubuntu/actions-runner/_work/aeo-server/aeo-server/nginx/conf.d/server-api.conf`
3. Restart nginx: `docker-compose -f docker-compose.prod.yml restart nginx`

## Important Notes

- The upstream `api_upstream` uses DNS resolver `127.0.0.11` (Docker's internal DNS)
- Both blue and green containers must have the `api` network alias
- The `resolve` directive allows nginx to pick up new container IPs dynamically
- Keep SSL certificates in `/etc/letsencrypt/` (mounted as read-only volume)

## Troubleshooting

If nginx can't reach the api containers:

```bash
# Check nginx can resolve the api hostname
docker exec aeo-nginx nslookup api

# Check nginx can reach the api
docker exec aeo-nginx wget -qO- http://api:5000/health

# Check nginx logs
docker logs aeo-nginx --tail 50

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```
