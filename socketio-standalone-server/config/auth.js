// ==========================================
// NEXTAUTH 5 CONFIGURATION FOR SOCKET.IO SERVER
// ==========================================
// Official NextAuth 5 configuration matching the main application
// Uses the same JWT token format and validation as the main app

const authConfig = {
  // ==========================================
  // SECRET CONFIGURATION - CRITICAL
  // ==========================================
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  // ==========================================
  // JWT CONFIGURATION - MATCHES MAIN APP
  // ==========================================
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days - matches main app
  },
  // ==========================================
  // COOKIE CONFIGURATION - MATCHES MAIN APP
  // ==========================================
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token', // FIXED: Must match main app exactly
      options: {
        httpOnly: false, // Required for Socket.IO client access
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '') 
          : undefined
      }
    }
  },

  // ==========================================
  // SESSION CONFIGURATION - JWT STRATEGY
  // ==========================================
  session: {
    strategy: 'jwt', // Must match main app for token compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // ==========================================
  // CORS CONFIGURATION
  // ==========================================
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  },

  // ==========================================
  // DEBUG AND LOGGING
  // ==========================================
  debug: process.env.NODE_ENV === 'development',
  
  logger: {
    error: (error) => console.error('[NextAuth Socket]', error),
    warn: (message) => console.warn('[NextAuth Socket]', message),
    debug: (message) => process.env.NODE_ENV === 'development' && console.log('[NextAuth Socket]', message),
  }
};

// ==========================================
// VALIDATION AND EXPORT
// ==========================================
if (!authConfig.secret) {
  throw new Error('AUTH_SECRET or NEXTAUTH_SECRET environment variable is required for NextAuth 5');
}

console.log('✅ NextAuth 5 Socket.IO configuration loaded successfully');
console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
console.log(`🔐 Secret: ${authConfig.secret ? 'configured' : 'missing'}`);
console.log(`🍪 Cookie name: ${authConfig.cookies.sessionToken.name}`);
console.log(`📡 CORS origins: ${authConfig.cors.origin}`);

module.exports = { authConfig };
