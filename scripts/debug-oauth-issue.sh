#!/bin/bash

# OAuth State Debug Script
# This script helps diagnose OAuth state issues in multi-instance deployments

echo "🔍 OAuth State Debug Script"
echo "=========================="

# Check if we're on the server
if [ -f "/etc/nginx/sites-available/server-api.themoda.io" ]; then
    echo "✅ Running on EC2 server"
    SERVER_MODE=true
else
    echo "⚠️  Running locally - some commands may not work"
    SERVER_MODE=false
fi

echo ""
echo "1. Checking nginx configuration..."
if [ "$SERVER_MODE" = true ]; then
    echo "Current nginx config:"
    sudo nginx -T 2>/dev/null | grep -A 10 "upstream api_upstream" || echo "❌ Could not find upstream config"
    
    echo ""
    echo "Checking if ip_hash is present:"
    if sudo nginx -T 2>/dev/null | grep -q "ip_hash"; then
        echo "✅ ip_hash found in nginx config"
    else
        echo "❌ ip_hash NOT found in nginx config"
        echo "   This means sticky sessions are not enabled!"
    fi
else
    echo "Skipping nginx check (not on server)"
fi

echo ""
echo "2. Checking Docker containers..."
if command -v docker &> /dev/null; then
    echo "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep aeo-server || echo "❌ No aeo-server containers found"
    
    echo ""
    echo "Container logs (last 20 lines from each):"
    for container in $(docker ps --format "{{.Names}}" | grep aeo-server); do
        echo "--- $container ---"
        docker logs $container --tail 20 2>/dev/null | grep -E "(oauth|state|Redis|InMemory)" || echo "No OAuth-related logs found"
        echo ""
    done
else
    echo "❌ Docker not available"
fi

echo ""
echo "3. Testing sticky sessions..."
if [ "$SERVER_MODE" = true ]; then
    echo "Making multiple requests to test load balancing:"
    for i in {1..5}; do
        echo -n "Request $i: "
        curl -s -I http://localhost:80/health 2>/dev/null | grep -o "HTTP/1.1 [0-9]*" || echo "Failed"
    done
    
    echo ""
    echo "Direct container access test:"
    echo "Port 5001 (blue):"
    curl -s -I http://localhost:5001/health 2>/dev/null | grep -o "HTTP/1.1 [0-9]*" || echo "Failed"
    echo "Port 5002 (green):"
    curl -s -I http://localhost:5002/health 2>/dev/null | grep -o "HTTP/1.1 [0-9]*" || echo "Failed"
else
    echo "Skipping sticky session test (not on server)"
fi

echo ""
echo "4. Checking Redis (if enabled)..."
if command -v docker &> /dev/null; then
    if docker ps | grep -q redis; then
        echo "✅ Redis container found"
        echo "Testing Redis connection:"
        docker exec aeo-redis-prod redis-cli ping 2>/dev/null || echo "❌ Redis not responding"
        
        echo ""
        echo "Checking OAuth keys in Redis:"
        docker exec aeo-redis-prod redis-cli KEYS "oauth:*" 2>/dev/null || echo "No OAuth keys found"
    else
        echo "⚠️  Redis container not found - using in-memory storage"
    fi
else
    echo "❌ Docker not available for Redis check"
fi

echo ""
echo "5. Recent OAuth logs..."
if command -v docker &> /dev/null; then
    for container in $(docker ps --format "{{.Names}}" | grep aeo-server); do
        echo "--- Recent OAuth logs from $container ---"
        docker logs $container --tail 50 2>/dev/null | grep -E "(login|callback|state|OAuth)" | tail -10 || echo "No recent OAuth logs"
        echo ""
    done
else
    echo "❌ Docker not available for log check"
fi

echo ""
echo "6. Environment variables..."
if command -v docker &> /dev/null; then
    for container in $(docker ps --format "{{.Names}}" | grep aeo-server | head -1); do
        echo "Environment from $container:"
        docker exec $container env 2>/dev/null | grep -E "(REDIS_URL|NODE_ENV|COGNITO)" || echo "No relevant env vars found"
    done
else
    echo "❌ Docker not available for env check"
fi

echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "======================="

if [ "$SERVER_MODE" = true ]; then
    if ! sudo nginx -T 2>/dev/null | grep -q "ip_hash"; then
        echo "1. ❌ CRITICAL: Enable sticky sessions:"
        echo "   sudo systemctl reload nginx"
        echo "   (After ensuring nginx config has ip_hash)"
    else
        echo "1. ✅ Sticky sessions appear to be configured"
    fi
else
    echo "1. ⚠️  SSH into EC2 and reload nginx: sudo systemctl reload nginx"
fi

echo ""
echo "2. 🔍 Check application logs for OAuth state debug messages:"
echo "   docker logs aeo-server-blue --tail 50"
echo "   docker logs aeo-server-green --tail 50"

echo ""
echo "3. 🔧 If still failing, consider enabling Redis:"
echo "   - Uncomment Redis in docker-compose.prod.yml"
echo "   - Add REDIS_URL to GitHub secrets"
echo "   - Redeploy"

echo ""
echo "4. 🧪 Test OAuth flow:"
echo "   - Clear browser cookies"
echo "   - Navigate to login page"
echo "   - Watch logs during authentication"

echo ""
echo "Debug script completed! 🎯"
