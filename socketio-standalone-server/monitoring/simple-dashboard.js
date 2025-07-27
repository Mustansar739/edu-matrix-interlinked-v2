// 🎓 STUDENT FRIENDLY: Simple Web Dashboard
// This creates a webpage you can visit to see your server stats!

function createSimpleDashboard() {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>📊 Socket.IO Server Dashboard - Student Edition</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .stat-label {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-active { background: #4CAF50; }
        .status-idle { background: #FFC107; }
        .status-error { background: #F44336; }
        .refresh-info {
            text-align: center;
            margin-top: 20px;
            opacity: 0.7;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Socket.IO Server Dashboard</h1>
            <h3>Student Edition - Learning Production Monitoring</h3>
            <div>
                <span class="status-indicator status-${getStatusClass(getStats().status)}"></span>
                Server Status: ${getStats().status.toUpperCase()}
            </div>
        </div>
        
        <div class="stats-grid" id="statsGrid">
            <!-- Stats will be loaded here -->
        </div>
        
        <div class="refresh-info">
            <p>📱 This dashboard auto-refreshes every 5 seconds</p>
            <p>💡 <strong>Learning Tip:</strong> Watch the numbers change as users connect and send messages!</p>
        </div>
    </div>

    <script>
        // Auto-refresh the dashboard every 5 seconds
        function loadStats() {
            fetch('/stats')
                .then(response => response.json())
                .then(data => {
                    updateDashboard(data);
                })
                .catch(error => {
                    console.error('Error loading stats:', error);
                });
        }

        function updateDashboard(stats) {
            const statsGrid = document.getElementById('statsGrid');
            
            // Calculate memory percentage (assuming 1GB max for demo)
            const memoryPercent = Math.min(100, (stats.memoryUsedMB / 1024) * 100);
            
            statsGrid.innerHTML = \`
                <div class="stat-card">
                    <div class="stat-number">👥 \${stats.connectedUsers}</div>
                    <div class="stat-label">Connected Users</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${Math.min(100, (stats.connectedUsers / 100) * 100)}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">💬 \${stats.messagesPerSecond}</div>
                    <div class="stat-label">Messages/Second</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${Math.min(100, (stats.messagesPerSecond / 10) * 100)}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">❌ \${stats.errorsPerSecond}</div>
                    <div class="stat-label">Errors/Second</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${Math.min(100, stats.errorsPerSecond * 20)}%; background: \${stats.errorsPerSecond > 0 ? '#F44336' : '#4CAF50'}"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">💾 \${stats.memoryUsedMB}MB</div>
                    <div class="stat-label">Memory Usage</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${memoryPercent}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">📊 \${stats.totalMessages}</div>
                    <div class="stat-label">Total Messages</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">⏱️ \${stats.uptime}</div>
                    <div class="stat-label">Server Uptime</div>
                </div>
            \`;
        }

        // ==========================================
        // REAL-TIME DASHBOARD - NO POLLING
        // ==========================================
        
        // Load initial stats immediately 
        loadStats();
        
        // PRODUCTION FIX: Use WebSocket for real-time updates instead of polling
        // Connect to the same Socket.IO server for real-time metrics
        const socket = io();
        
        socket.on('connect', () => {
            console.log('📊 Dashboard connected to real-time metrics');
            // Join dashboard room for broadcast updates
            socket.emit('join-dashboard');
            // Request initial stats
            socket.emit('request-metrics');
        });
        
        socket.on('metrics-update', (stats) => {
            // Real-time metrics update - no polling needed!
            updateDashboardStats(stats);
        });
        
        socket.on('disconnect', () => {
            console.log('📊 Dashboard disconnected - attempting reconnect');
        });
        
        // Error handling
        socket.on('metrics-error', (error) => {
            console.error('📊 Metrics error:', error);
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            socket.emit('leave-dashboard');
        });
        
        // Fallback: Request metrics every 30 seconds only if WebSocket is disconnected
        setInterval(() => {
            if (!socket.connected) {
                // Only use HTTP fallback if WebSocket is down
                console.log('📊 WebSocket disconnected, using HTTP fallback');
                loadStats();
            }
        }, 30000); // 30 seconds instead of 5 seconds
        
        // Helper function to update dashboard with real-time stats
        function updateDashboardStats(stats) {
            // Update the same way as loadStats() but with provided data
            const memoryPercent = Math.min(100, (stats.memoryUsedMB / 512) * 100);
            
            document.getElementById('dashboard-stats').innerHTML = \`
                <div class="stat-card">
                    <div class="stat-number">🟢 \${stats.connectedClients}</div>
                    <div class="stat-label">Connected Clients</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${Math.min(100, (stats.connectedClients / 100) * 100)}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">📨 \${stats.messagesPerSecond}</div>
                    <div class="stat-label">Messages/Second</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${Math.min(100, (stats.messagesPerSecond / 10) * 100)}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">❌ \${stats.errorsPerSecond}</div>
                    <div class="stat-label">Errors/Second</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${Math.min(100, stats.errorsPerSecond * 20)}%; background: \${stats.errorsPerSecond > 0 ? '#F44336' : '#4CAF50'}"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">💾 \${stats.memoryUsedMB}MB</div>
                    <div class="stat-label">Memory Usage</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${memoryPercent}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">📊 \${stats.totalMessages}</div>
                    <div class="stat-label">Total Messages</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">⏱️ \${stats.uptime}</div>
                    <div class="stat-label">Server Uptime</div>
                </div>
            \`;
        }
    </script>
</body>
</html>
  `;
}

// Helper function to get status class for CSS
function getStatusClass(status) {
  switch(status) {
    case 'active': return 'status-active';
    case 'idle': return 'status-idle';
    default: return 'status-error';
  }
}

module.exports = { createSimpleDashboard };
