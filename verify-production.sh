#!/bin/bash
# ==========================================
# EDU MATRIX INTERLINKED - ORACLE CLOUD VERIFICATION SCRIPT
# ==========================================
# Run this script after updating Oracle Cloud Security Groups

echo "🔍 EDU MATRIX INTERLINKED - PRODUCTION VERIFICATION"
echo "=================================================="
echo "ℹ️  Status: Oracle Cloud Security Lists need to be updated"
echo "📋 Required: See ORACLE_CLOUD_SECURITY_CONFIGURATION_REQUIRED.md"
echo

# Test network speed
echo "📊 Network Speed Test:"
speedtest --simple
echo

# Test HTTPS health endpoint
echo "🏥 Testing HTTPS Health Endpoint:"
echo "Testing: https://80.225.220.94/health"
timeout 10 curl -k -s https://80.225.220.94/health | jq . 2>/dev/null || echo "❌ Connection timeout - Oracle Cloud Security Lists need to be updated"
echo -e "\n"

# Test main application
echo "🌐 Testing Main Application:"
echo "Testing: https://80.225.220.94"
response=$(timeout 10 curl -k -s -o /dev/null -w "%{http_code}" https://80.225.220.94 2>/dev/null || echo "timeout")
if [ "$response" = "200" ]; then
    echo "✅ Main application accessible (HTTP $response)"
elif [ "$response" = "timeout" ]; then
    echo "❌ Connection timeout - Oracle Cloud Security Lists need to be updated"
else
    echo "❌ Main application error (HTTP $response)"
fi
echo

# Test WebSocket connection
echo "🔌 Testing WebSocket Connection:"
echo "Testing: wss://80.225.220.94/socket.io/"
# Simple WebSocket test using curl
response=$(timeout 10 curl -k -s -o /dev/null -w "%{http_code}" "https://80.225.220.94/socket.io/?EIO=4&transport=polling" 2>/dev/null || echo "timeout")
if [ "$response" = "200" ]; then
    echo "✅ Socket.IO endpoint accessible (HTTP $response)"
elif [ "$response" = "timeout" ]; then
    echo "❌ Connection timeout - Oracle Cloud Security Lists need to be updated"
else
    echo "❌ Socket.IO endpoint error (HTTP $response)"
fi
echo

# Check service status
echo "🐳 Docker Services Status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo

# Check Nginx status
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l | grep -E "(Active|Main PID|Tasks)"
echo

# SSL Certificate info
echo "🔒 SSL Certificate Information:"
echo | openssl s_client -connect 80.225.220.94:443 -servername 80.225.220.94 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null || echo "❌ SSL connection failed - Check Oracle Cloud Security Groups"
echo

# Final URLs
echo "🎉 PRODUCTION URLS (After Oracle Cloud Security Groups Fix):"
echo "=================================================="
echo "🌐 Main Application:    https://80.225.220.94"
echo "⚡ Socket.IO WebSocket: wss://80.225.220.94/socket.io/"
echo "🏥 Health Check:        https://80.225.220.94/health"
echo
echo "🔧 Don't forget to update Google OAuth with these URLs!"
echo "=================================================="
