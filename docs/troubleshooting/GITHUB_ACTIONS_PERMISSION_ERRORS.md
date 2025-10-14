# GitHub Actions Permission Errors

## Problem

GitHub Actions self-hosted runner fails during checkout with:

```
Error: EACCES: permission denied, rmdir '/path/to/nginx/conf.d'
```

## Root Cause

Docker containers create directories and files with **root ownership** when mounting volumes. The GitHub Actions runner (running as `ec2-user` or `ubuntu`) cannot delete these files during the checkout step.

### Why This Happens

1. Docker mounts `./nginx/conf.d` as a volume
2. Docker creates this directory with root permissions
3. GitHub Actions `checkout@v4` tries to clean the workspace
4. Checkout fails because it can't delete root-owned files

---

## ✅ Solution (Already Applied)

The workflow has been updated to fix permissions before checkout:

```yaml
- name: Fix permissions before checkout
  run: |
    # Fix ownership of directories that Docker might have created
    sudo chown -R $USER:$USER . 2>/dev/null || true
    echo "✅ Permissions fixed"

- name: Checkout source code
  uses: actions/checkout@v4
```

This runs **before** checkout and fixes all permissions in the working directory.

---

## 🔧 Manual Fix (If Needed)

If the workflow still fails, SSH to the EC2 server and run:

```bash
# Navigate to the runner's work directory
cd /home/ec2-user/actions-runner/server/aeo-server/aeo-server
# or
cd /home/ubuntu/actions-runner/_work/aeo-server/aeo-server

# Fix all permissions
sudo chown -R $USER:$USER .

# Verify
ls -la nginx/conf.d/
# Should show your user as owner, not root
```

---

## 🚫 Prevention

### Option 1: Use Named Volumes (Recommended for Dev)

```yaml
volumes:
  nginx_conf:

services:
  nginx:
    volumes:
      - nginx_conf:/etc/nginx/conf.d
```

### Option 2: Set Proper Permissions in Dockerfile

```dockerfile
RUN chown -R nginx:nginx /etc/nginx/conf.d
```

### Option 3: Use Read-Only Mounts (Current Approach)

```yaml
volumes:
  - ./nginx/conf.d:/etc/nginx/conf.d:ro # Read-only
```

This is what we're using in production. The `:ro` flag makes it read-only, which helps prevent permission issues.

---

## 📋 Related Issues

### Docker Compose Down Permission Errors

If `docker-compose down` fails with permission errors:

```bash
sudo chown -R $USER:$USER .
docker-compose -f docker-compose.prod.yml down
```

### Can't Delete nginx/conf.d Manually

```bash
# As regular user (fails)
rm -rf nginx/conf.d
# Error: Permission denied

# With sudo (works)
sudo rm -rf nginx/conf.d
```

### GitHub Actions Runner Cache Issues

If the runner gets into a bad state:

```bash
# On EC2 server
cd /home/ec2-user/actions-runner
# or
cd /home/ubuntu/actions-runner

# Stop the runner
./svc.sh stop

# Clean the work directory
sudo rm -rf _work/*

# Fix permissions
sudo chown -R $USER:$USER _work

# Restart the runner
./svc.sh start
```

---

## 🔍 Debugging

### Check File Ownership

```bash
ls -la nginx/conf.d/
# If you see 'root' as owner, that's the problem
```

### Check Docker Volume Mounts

```bash
docker inspect aeo-nginx | grep -A 10 Mounts
```

### Check Runner Logs

```bash
cd /home/ec2-user/actions-runner
tail -f _diag/Runner_*.log
```

---

## ✅ Verification

After the fix, the workflow should:

1. ✅ Run "Fix permissions before checkout" step
2. ✅ Successfully checkout code
3. ✅ Build and deploy without permission errors

Monitor the GitHub Actions logs to confirm.

---

## 📚 Related Documentation

- [SERVER_DOWN_CHECKLIST.md](./SERVER_DOWN_CHECKLIST.md) - General recovery
- [QUICK_FIX.md](./QUICK_FIX.md) - Fast fixes
- [Nginx README](../../nginx/README.md) - Nginx configuration

---

**Last Updated:** October 2025  
**Issue Status:** ✅ Fixed in workflow
