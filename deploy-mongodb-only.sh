#!/bin/bash

echo "🚀 Deploying MongoDB-Only OAuth Fix..."
echo "====================================="

# Stop all containers
echo "1. Stopping all containers..."
docker-compose -f docker-compose.prod.yml down

# Remove Redis container if it exists
echo "2. Removing Redis container..."
docker stop aeo-redis-prod 2>/dev/null || true
docker rm aeo-redis-prod 2>/dev/null || true

# Pull latest code
echo "3. Pulling latest code..."
git pull origin main

# Build and deploy
echo "4. Building and deploying new containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for containers to start
echo "5. Waiting for containers to start..."
sleep 15

# Check logs for MongoDB initialization
echo "6. Checking logs for MongoDB initialization..."
echo "=================================="
echo "BLUE CONTAINER LOGS:"
docker logs aeo-server-blue | grep -E "(MongoDB|🗄️|trust proxy|Session store|OAuth state)" | tail -10

echo "=================================="
echo "GREEN CONTAINER LOGS:"
docker logs aeo-server-green | grep -E "(MongoDB|🗄️|trust proxy|Session store|OAuth state)" | tail -10

echo "=================================="
echo "Container status:"
docker ps

echo "=================================="
echo "✅ Deployment complete!"
echo ""
echo "🔍 Expected logs should show:"
echo "- '🗄️ Initializing MongoDB session store...'"
echo "- '🗄️ MongoSessionStore constructor called'"
echo "- '🗄️ Session store initialized with MongoDB'"
echo "- '🗄️ [MongoDB] OAuth state service initialized'"
echo "- '🗄️ Using MongoDB for OAuth state management'"
echo "- NO 'memory store' messages"
echo "- NO 'trust proxy' errors"
echo ""
echo "🧪 Test OAuth by visiting: https://api.themoda.io/api/auth/cognito/login"
