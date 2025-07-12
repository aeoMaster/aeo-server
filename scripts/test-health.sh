#!/bin/bash

# Test Health Endpoints Script
set -e

echo "🏥 Testing Health Endpoints"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local name=$2
    
    echo -e "${YELLOW}Testing $name endpoint...${NC}"
    response=$(curl -s -w "%{http_code}" "http://localhost:5000$endpoint" -o /tmp/response.json)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ $name endpoint is working${NC}"
        echo "Response:"
        cat /tmp/response.json | jq . 2>/dev/null || cat /tmp/response.json
    else
        echo -e "${RED}❌ $name endpoint failed with status $response${NC}"
        cat /tmp/response.json
    fi
    echo ""
}

# Check if server is running
if ! curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running. Please start it with: npm run dev${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server is running on localhost:5000${NC}"
echo ""

# Test all health endpoints
test_endpoint "/health" "Basic Health"
test_endpoint "/health/detailed" "Detailed Health"
test_endpoint "/health/aws" "AWS Health"

echo -e "${GREEN}🎉 All health endpoint tests completed!${NC}"

# Clean up
rm -f /tmp/response.json 