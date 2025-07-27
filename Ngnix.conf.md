# ==========================================
# EDU MATRIX INTERLINKED - NGINX CONFIGURATION
# ==========================================
# Production-ready Nginx configuration with SSL and reverse proxy

server {
    listen 80;
    server_name 80.225.220.94;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 80.225.220.94;
    
    # SSL Configuration (will be updated by certbot)
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Main Next.js Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Socket.IO Server with WebSocket Support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Socket.IO specific headers
        proxy_set_header Origin $http_origin;
        proxy_set_header Sec-WebSocket-Protocol $http_sec_websocket_protocol;
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
    }
    
    # Health Check Endpoints
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static Files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}


# ==========================================
path : /tmp/nginx.conf    
# ==========================================
# Copy the Nginx configuration to the appropriate directory
sudo cp /tmp/edu-matrix-nginx.conf /etc/nginx/sites-available/edu-matrix-interlinked
# Enable the site
sudo ln -s /etc/nginx/sites-available/edu-matrix-interlinked /etc/nginx/sites-enabled/

# Remove the default Nginx configuration
sudo rm /etc/nginx/sites-enabled/default

# Test the Nginx configuration for syntax errors
sudo nginx -t

# If the test is successful, reload Nginx to apply the changes
sudo systemctl restart nginx

# Check the status of Nginx to ensure it's running correctly
sudo systemctl status nginx

(Jul 01 02:10:44 instance-20250628-0217 systemd[1]: Starting nginx.service - A high performance web>
lines 1-18...skipping...
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: active (running) since Tue 2025-07-01 02:10:44 UTC; 1min 17s ago
       Docs: man:nginx(8)
    Process: 2211641 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; master_process on; (code=exi>
    Process: 2211644 ExecStart=/usr/sbin/nginx -g daemon on; master_process on; (code=exited, stat>
   Main PID: 2211645 (nginx)
      Tasks: 5 (limit: 27485)
     Memory: 4.1M (peak: 4.4M)
        CPU: 24ms
     CGroup: /system.slice/nginx.service
             ├─2211645 "nginx: master process /usr/sbin/nginx -g daemon on; master_process on;"
             ├─2211646 "nginx: worker process"
             ├─2211647 "nginx: worker process"
             ├─2211648 "nginx: worker process"
             └─2211649 "nginx: worker process"

Jul 01 02:10:44 instance-20250628-0217 systemd[1]: Starting nginx.service - A high performance web>
Jul 01 02:10:44 instance-20250628-0217 systemd[1]: Started nginx.service - A high performance web >
lines 1-19...skipping...)
# ==========================================
# Now let me create a self-signed certificate for immediate SSL support:
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt -subj "/C=US/ST=CA/L=SF/O=EduMatrix/CN=80.225.220.94"
