# Socket.IO Authentication Implementation Guide

## 🚀 Overview
# Socketio standalone server is Running in docker container 
This project implements **official Socket.IO + NextAuth 5 authentication** using only official methods and best practices. The implementation ensures secure, user-friendly real-time connections between client and server.

## 🏗️ Architecture

### Server-Side (Official Methods)
- **NextAuth 5 JWT Decoding**: Uses `@auth/core/jwt.decode()` 
- **Official Socket.IO Middleware**: `io.use()` for connection authentication
- **Multi-source Token Extraction**: Auth object → Cookies → Headers
- **User-friendly Error Messages**: Clear feedback for authentication issues

### Client-Side (Official Methods)
- **NextAuth 5 Session Management**: `useSession()` hook
- **Official Socket.IO Client**: Latest Socket.IO client with official configuration
- **Cookie-based Authentication**: Official `next-auth.session-token` parsing
- **Auth Object Transmission**: Official `auth: { token }` method
- **Transport Agnostic**: WebSocket with polling fallback

## 📁 Key Files

```
├── socketio-standalone-server/
│   ├── middleware/auth.js          # Official NextAuth 5 + Socket.IO middleware
│   └── server.js                   # Socket.IO server with auth integration
├── lib/socket/
│   └── socket-context-clean.tsx    # Official client context implementation
├── components/
│   ├── socket-status-indicator.tsx # User-friendly connection status
│   └── testing/socket-auth-test.tsx # Authentication test dashboard
└── app/
    ├── layout.tsx                  # App layout with Socket providers
    └── test/socket-auth/page.tsx   # Test page for authentication
```

## 🔐 Authentication Flow

### 1. Client Authentication
```typescript
// Official NextAuth 5 session
const { data: session } = useSession()

// Official cookie extraction
const getSessionToken = (): string | null => {
  const cookies = Object.fromEntries(
    document.cookie.split('; ').map(c => {
      const [name, value] = c.split('=')
      return [name, decodeURIComponent(value || '')]
    })
  )
  return cookies['next-auth.session-token'] || null
}

// Official Socket.IO client configuration
const socket = io(SERVER_URL, {
  auth: {                    // 🎯 Official auth object method
    token: sessionToken,
    userId: session.user.id,
    email: session.user.email
  },
  withCredentials: true,     // 🎯 Enable cookie transmission
  transports: ['websocket', 'polling'] // 🎯 Official transport config
})
```

### 2. Server Authentication
```javascript
// Official NextAuth 5 middleware class
class NextAuthSocketMiddleware {
  async authenticateConnection(socket, next) {
    // 🎯 Multi-source token extraction (official priority order)
    const token = this.extractToken(socket) // auth → cookies → headers
    
    // 🎯 Official NextAuth 5 JWT verification
    const decoded = await decode({
      token: token,
      secret: this.secret,
      salt: 'authjs.session-token'  // Official NextAuth 5 salt
    })
    
    // 🎯 Attach authenticated user to socket
    socket.user = decoded
    socket.authenticated = true
    next()
  }
}

// 🎯 Official Socket.IO middleware registration
io.use(async (socket, next) => {
  await authMiddleware.authenticateConnection(socket, next)
})
```

## 🎯 Official Methods Used

### ✅ Socket.IO Official Methods
- `io.use()` for connection middleware
- `socket.handshake.auth` for authentication data
- `socket.handshake.headers.cookie` for cookie parsing
- Official event handlers: `connect`, `disconnect`, `connect_error`
- Official client configuration: `auth`, `withCredentials`, `transports`

### ✅ NextAuth 5 Official Methods
- `@auth/core/jwt.decode()` for JWT verification
- `useSession()` hook for session management
- Official cookie name: `next-auth.session-token`
- Official JWT salt: `authjs.session-token`

### ✅ Security Best Practices
- Token validation with expiration checks
- Multi-source authentication with priority order
- User-friendly error messages
- Rate limiting and connection validation
- Proper disconnect handling

## 🧪 Testing

### Automated Tests
```bash
# Run server-side authentication tests
node test-socket-auth.js

# Set test token for complete testing
export TEST_JWT_TOKEN="your-valid-jwt-token"
node test-socket-auth.js
```

### Interactive Testing
1. Navigate to `/test/socket-auth`
2. Sign in to your account
3. View real-time authentication status
4. Test connection/disconnection
5. Verify all official methods are working

## 🚀 Getting Started

### 1. Environment Setup
```bash
# Main app environment
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
AUTH_SECRET=your-auth-secret

# Socket.IO server environment
SOCKET_IO_PORT=3001
SOCKET_IO_CORS_ORIGIN=http://localhost:3000
AUTH_SECRET=your-auth-secret  # Same as main app
```

### 2. Start Services
```bash
# Start Socket.IO server
cd socketio-standalone-server
npm install
npm start

# Start Next.js app
npm install
npm run dev
```

### 3. Test Authentication
- Visit `http://localhost:3000/test/socket-auth`
- Sign in with your account
- Verify connection status shows "Connected"
- Check that all tests pass

## 🔧 Configuration Options

### Client Configuration
```typescript
const socket = io(SERVER_URL, {
  // Official transport methods
  transports: ['websocket', 'polling'],
  
  // Official authentication
  auth: {
    token: sessionToken,
    userId: session.user.id
  },
  
  // Official connection options
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  withCredentials: true
})
```

### Server Configuration
```javascript
const io = new Server(server, {
  // Official CORS configuration
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(','),
    credentials: true,
    methods: ['GET', 'POST']
  },
  
  // Official transport configuration
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})
```

## 🛡️ Security Features

### ✅ Authentication Security
- JWT token validation with NextAuth 5 official methods
- Token expiration checking
- Multi-source token extraction with priority
- User session validation

### ✅ Connection Security
- CORS configuration for allowed origins
- Rate limiting on connections and events
- Connection validation middleware
- Proper error handling and logging

### ✅ User Experience
- User-friendly error messages
- Real-time connection status indicator
- Automatic reconnection with authentication
- Clear feedback for authentication issues

## 📊 Monitoring & Debugging

### Connection Status
The app includes a real-time connection status indicator that shows:
- Connection state (connected/connecting/error/auth_required)
- User authentication status
- Socket ID and user information
- Error messages with actionable guidance

### Logging
Server-side logging includes:
- Authentication attempts and results
- Connection/disconnection events
- Token validation details
- Error tracking with user context

## 🔍 Troubleshooting

### Common Issues

**"Authentication required" Error**
- Ensure user is signed in with NextAuth 5
- Check that session token is being extracted correctly
- Verify AUTH_SECRET matches between client and server

**Connection Timeout**
- Check Socket.IO server is running on correct port
- Verify CORS origins are configured properly
- Ensure firewall allows Socket.IO traffic

**Token Validation Failed**
- Confirm AUTH_SECRET environment variable is set
- Check token expiration (30 days default)
- Verify JWT salt matches NextAuth 5 configuration

### Debug Mode
Enable debug logging:
```bash
# Client-side
localStorage.debug = 'socket.io-client:*'

# Server-side
DEBUG=socket.io:* npm start
```

## 🎉 Success Indicators

✅ **Perfect Implementation When:**
- All authentication tests pass
- Connection status shows "Connected" 
- Socket user matches session user
- Real-time features work seamlessly
- Error messages are user-friendly
- Reconnection works automatically

This implementation follows all official Socket.IO and NextAuth 5 best practices for a secure, reliable, and user-friendly real-time authentication system.
