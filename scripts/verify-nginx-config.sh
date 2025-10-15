#!/bin/bash

# Quick nginx configuration verification script

echo "🔍 Verifying nginx configuration for OAuth sticky sessions"
echo "=========================================================="

# Check if nginx config file exists in the right location
echo "1. Checking nginx configuration file location..."

if [ -f "/etc/nginx/sites-available/server-api.themoda.io" ]; then
    echo "✅ Found: /etc/nginx/sites-available/server-api.themoda.io"
    CONFIG_FILE="/etc/nginx/sites-available/server-api.themoda.io"
elif [ -f "/etc/nginx/conf.d/server-api-native.conf" ]; then
    echo "✅ Found: /etc/nginx/conf.d/server-api-native.conf"
    CONFIG_FILE="/etc/nginx/conf.d/server-api-native.conf"
else
    echo "❌ No nginx config file found in expected locations!"
    echo "   Expected locations:"
    echo "   - /etc/nginx/sites-available/server-api.themoda.io"
    echo "   - /etc/nginx/conf.d/server-api-native.conf"
    exit 1
fi

echo ""
echo "2. Checking if ip_hash is configured..."

if grep -q "ip_hash" "$CONFIG_FILE"; then
    echo "✅ ip_hash found in configuration"
    echo "   Line with ip_hash:"
    grep -n "ip_hash" "$CONFIG_FILE"
else
    echo "❌ ip_hash NOT found in configuration!"
    echo "   This means sticky sessions are not enabled."
    echo ""
    echo "   Current upstream configuration:"
    grep -A 10 "upstream api_upstream" "$CONFIG_FILE" || echo "No upstream block found"
    echo ""
    echo "🔧 TO FIX: Add 'ip_hash;' line in the upstream block"
    exit 1
fi

echo ""
echo "3. Checking if nginx configuration is valid..."
if sudo nginx -t 2>/dev/null; then
    echo "✅ nginx configuration is valid"
else
    echo "❌ nginx configuration has errors:"
    sudo nginx -t
    exit 1
fi

echo ""
echo "4. Checking if nginx needs reload..."
# Check if the config file is newer than nginx process start time
NGINX_PID=$(pgrep nginx | head -1)
if [ -n "$NGINX_PID" ]; then
    NGINX_START=$(stat -c %Y /proc/$NGINX_PID 2>/dev/null || echo "0")
    CONFIG_MODIFIED=$(stat -c %Y "$CONFIG_FILE" 2>/dev/null || echo "0")
    
    if [ "$CONFIG_MODIFIED" -gt "$NGINX_START" ]; then
        echo "⚠️  nginx needs reload (config file is newer than nginx process)"
        echo "   Run: sudo systemctl reload nginx"
    else
        echo "✅ nginx is up to date"
    fi
else
    echo "❌ nginx process not found"
fi

echo ""
echo "5. Current nginx status..."
sudo systemctl is-active nginx 2>/dev/null && echo "✅ nginx is running" || echo "❌ nginx is not running"

echo ""
echo "6. Testing load balancing (if nginx is running)..."
if sudo systemctl is-active nginx >/dev/null 2>&1; then
    echo "Making test requests to check load balancing:"
    for i in {1..3}; do
        echo -n "Request $i: "
        # Use a simple HTTP request that will show which backend responded
        curl -s -H "Host: server-api.themoda.io" http://localhost/health 2>/dev/null | head -1 || echo "Failed"
    done
else
    echo "Skipping load balancer test (nginx not running)"
fi

echo ""
echo "📋 SUMMARY:"
echo "==========="

if grep -q "ip_hash" "$CONFIG_FILE" && sudo nginx -t >/dev/null 2>&1; then
    echo "✅ Configuration looks good!"
    if [ "$CONFIG_MODIFIED" -gt "$NGINX_START" ] 2>/dev/null; then
        echo "⚠️  But nginx needs reload: sudo systemctl reload nginx"
    else
        echo "✅ nginx is up to date and should have sticky sessions enabled"
    fi
else
    echo "❌ Configuration needs fixes"
    echo "   1. Ensure ip_hash is in upstream block"
    echo "   2. Run: sudo nginx -t (to test config)"
    echo "   3. Run: sudo systemctl reload nginx"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. If config is good but nginx needs reload: sudo systemctl reload nginx"
echo "   2. Test OAuth login flow"
echo "   3. Check logs for OAuth state debug messages"
echo "   4. If still failing, consider enabling Redis"
