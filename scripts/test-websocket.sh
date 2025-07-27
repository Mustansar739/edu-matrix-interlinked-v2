#!/bin/bash

# ==========================================
# WEBSOCKET CONNECTION TEST SCRIPT
# ==========================================
# Tests WebSocket connectivity and diagnoses issues

echo "🔍 WebSocket Connection Diagnostic Tool"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SOCKET_URL="https://80.225.220.94"
SOCKET_PATH="/socket.io/"
HTTP_URL="http://localhost:3001"

echo -e "${BLUE}Testing Socket.IO connectivity...${NC}\n"

# Test 1: Check if Docker services are running
echo -e "${YELLOW}1. Checking Docker services...${NC}"
if docker compose ps | grep -q "Up.*healthy"; then
    echo -e "${GREEN}✅ Docker services are running and healthy${NC}"
else
    echo -e "${RED}❌ Docker services not running properly${NC}"
    echo -e "Run: ${BLUE}docker compose up -d${NC}"
    exit 1
fi

# Test 2: Check Socket.IO server health
echo -e "\n${YELLOW}2. Testing Socket.IO server health...${NC}"
if curl -f -s "http://localhost:3001/health" > /dev/null; then
    echo -e "${GREEN}✅ Socket.IO server is healthy${NC}"
    curl -s "http://localhost:3001/health" | head -5
else
    echo -e "${RED}❌ Socket.IO server health check failed${NC}"
    echo -e "Check logs: ${BLUE}docker logs edu-matrix-socketio${NC}"
fi

# Test 3: Check Socket.IO endpoint accessibility
echo -e "\n${YELLOW}3. Testing Socket.IO endpoint...${NC}"
if curl -f -s "http://localhost:3001/socket.io/" > /dev/null; then
    echo -e "${GREEN}✅ Socket.IO endpoint accessible${NC}"
else
    echo -e "${RED}❌ Socket.IO endpoint not accessible${NC}"
    echo -e "Check CORS configuration in docker-compose.yml"
fi

# Test 4: Check nginx configuration (if exists)
echo -e "\n${YELLOW}4. Checking nginx configuration...${NC}"
if [ -f "/etc/nginx/sites-available/edu-matrix" ] || [ -f "./nginx.conf" ]; then
    echo -e "${GREEN}✅ Nginx configuration found${NC}"
    echo -e "Make sure to:"
    echo -e "  - Copy ./nginx.conf to /etc/nginx/sites-available/edu-matrix"
    echo -e "  - Enable site: ${BLUE}sudo ln -sf /etc/nginx/sites-available/edu-matrix /etc/nginx/sites-enabled/${NC}"
    echo -e "  - Test config: ${BLUE}sudo nginx -t${NC}"
    echo -e "  - Reload nginx: ${BLUE}sudo systemctl reload nginx${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx configuration not installed${NC}"
    echo -e "Install with:"
    echo -e "  ${BLUE}sudo cp ./nginx.conf /etc/nginx/sites-available/edu-matrix${NC}"
    echo -e "  ${BLUE}sudo ln -sf /etc/nginx/sites-available/edu-matrix /etc/nginx/sites-enabled/${NC}"
    echo -e "  ${BLUE}sudo nginx -t && sudo systemctl reload nginx${NC}"
fi

# Test 5: Check ports
echo -e "\n${YELLOW}5. Checking port accessibility...${NC}"
if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "${GREEN}✅ Port 3001 (Socket.IO) is listening${NC}"
else
    echo -e "${RED}❌ Port 3001 not accessible${NC}"
fi

if netstat -tlnp 2>/dev/null | grep -q ":443"; then
    echo -e "${GREEN}✅ Port 443 (HTTPS) is listening${NC}"
else
    echo -e "${YELLOW}⚠️  Port 443 (HTTPS) not listening - nginx might not be running${NC}"
fi

# Test 6: Check environment variables
echo -e "\n${YELLOW}6. Checking environment configuration...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ Environment file found${NC}"
    echo -e "Current Socket.IO URL: ${BLUE}$(grep NEXT_PUBLIC_SOCKET_URL .env.local)${NC}"
    echo -e "CORS Origins: ${BLUE}$(grep SOCKET_IO_CORS_ORIGIN .env.local)${NC}"
else
    echo -e "${RED}❌ .env.local not found${NC}"
fi

# Test 7: WebSocket connection test using Node.js
echo -e "\n${YELLOW}7. Testing WebSocket connection...${NC}"
if command -v node > /dev/null; then
    cat > temp_socket_test.js << 'EOF'
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    forceNew: true
});

socket.on('connect', () => {
    console.log('✅ WebSocket connection successful!');
    console.log('Socket ID:', socket.id);
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.log('❌ WebSocket connection failed:', error.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('❌ Connection timeout');
    process.exit(1);
}, 10000);
EOF

    echo -e "Running Node.js WebSocket test..."
    if node temp_socket_test.js 2>/dev/null; then
        echo -e "${GREEN}✅ Direct WebSocket connection works${NC}"
    else
        echo -e "${RED}❌ Direct WebSocket connection failed${NC}"
        echo -e "This might be normal if nginx proxy is required"
    fi
    rm -f temp_socket_test.js
else
    echo -e "${YELLOW}⚠️  Node.js not available for WebSocket test${NC}"
fi

# Test 8: Check SSL certificate (if HTTPS)
echo -e "\n${YELLOW}8. Checking SSL configuration...${NC}"
if command -v openssl > /dev/null; then
    if echo | timeout 5 openssl s_client -connect 80.225.220.94:443 2>/dev/null | grep -q "CONNECTED"; then
        echo -e "${GREEN}✅ SSL connection successful${NC}"
    else
        echo -e "${RED}❌ SSL connection failed${NC}"
        echo -e "Check SSL certificate configuration"
    fi
else
    echo -e "${YELLOW}⚠️  OpenSSL not available for SSL test${NC}"
fi

echo -e "\n${BLUE}Diagnostic Summary:${NC}"
echo -e "==================="
echo -e "1. Ensure all Docker services are healthy"
echo -e "2. Install and configure nginx with WebSocket support"
echo -e "3. Verify SSL certificates are properly configured"
echo -e "4. Check firewall settings for ports 80, 443, 3001"
echo -e "5. Test from browser developer tools: Network -> WS tab"

echo -e "\n${GREEN}To fix WebSocket errors:${NC}"
echo -e "1. ${BLUE}sudo cp ./nginx.conf /etc/nginx/sites-available/edu-matrix${NC}"
echo -e "2. ${BLUE}sudo ln -sf /etc/nginx/sites-available/edu-matrix /etc/nginx/sites-enabled/${NC}"
echo -e "3. ${BLUE}sudo nginx -t && sudo systemctl reload nginx${NC}"
echo -e "4. ${BLUE}docker compose restart socketio${NC}"
echo -e "5. Test in browser and check Network -> WS tab for successful upgrades"

echo -e "\n${YELLOW}If issues persist, check browser console and network tab${NC}"
