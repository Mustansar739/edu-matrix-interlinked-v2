// ==========================================
// NEXTAUTH 5 SOCKET.IO AUTHENTICATION MIDDLEWARE
// ==========================================
// Official NextAuth 5 implementation for Socket.IO server authentication
// Compatible with Next.js 15 and NextAuth 5.0.0-beta.28+

const { decode } = require('@auth/core/jwt');
const { logger } = require('../utils/logger');
const { authConfig } = require('../config/auth');

/**
 * NextAuth 5 Socket.IO Authentication Middleware
 * Validates JWT tokens using official NextAuth 5 methods
 */
class NextAuthSocketMiddleware {
  constructor() {
    this.secret = authConfig.secret;
    
    if (!this.secret) {
      throw new Error('AUTH_SECRET or NEXTAUTH_SECRET environment variable is required');
    }    // NextAuth 5 JWT configuration matching main app
    this.jwtConfig = {
      secret: this.secret,
      salt: 'next-auth.session-token', // FIXED: Must match main app cookie name exactly
      maxAge: authConfig.jwt.maxAge,
    };    logger.info('✅ NextAuth 5 Socket.IO middleware initialized');
    logger.info(`🔐 Using secret: ${this.secret ? 'configured' : 'missing'}`);
    logger.info(`🧂 Using salt: ${this.jwtConfig.salt} (matches main app)`);
  }/**
   * Extract token from Socket.IO handshake
   * Official NextAuth 5 compatible token extraction
   */
  extractToken(socket) {
    try {
      logger.info('🔍 Extracting token from socket handshake...')
      
      // Method 1: From auth object (official Socket.IO authentication)
      const authToken = socket.handshake.auth?.token;
      if (authToken && typeof authToken === 'string' && authToken.length > 0) {
        logger.info(`✅ Token found in auth object (length: ${authToken.length})`);
        return authToken;
      } else {
        logger.info('❌ No token in auth object');
      }

      // Method 2: From cookies (NextAuth 5 standard method)
      const cookies = socket.handshake.headers.cookie;
      logger.info(`🍪 Cookies header: ${cookies ? 'present' : 'missing'}`);
      
      if (cookies) {        // Try multiple possible NextAuth 5 cookie names
        const possibleCookieNames = [
          'next-auth.session-token',              // Standard NextAuth 5 production
          '__Secure-next-auth.session-token',     // Secure production
          'authjs.session-token',                 // Alternative NextAuth 5 format
          '__Secure-authjs.session-token'         // Secure alternative
        ];
        
        for (const cookieName of possibleCookieNames) {
          const regex = new RegExp(`${cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]+)`);
          const tokenMatch = cookies.match(regex);
          if (tokenMatch) {
            logger.info(`✅ Token found in cookie: ${cookieName} (length: ${tokenMatch[1].length})`);
            try {
              return decodeURIComponent(tokenMatch[1]);
            } catch (decodeError) {
              logger.warn(`Failed to decode cookie value, using raw: ${decodeError.message}`);
              return tokenMatch[1];
            }
          }
        }
        logger.info('❌ No token found in any cookie');
      }

      // Method 3: From authorization header (API clients)
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        logger.info('✅ Token found in authorization header');
        return authHeader.substring(7);
      } else {
        logger.info('❌ No valid authorization header');
      }

      // Method 4: From query parameters (fallback)
      const queryToken = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (queryToken) {
        logger.info('✅ Token found in query parameters');
        return queryToken;
      } else {
        logger.info('❌ No token in query parameters');
      }

      logger.warn('❌ No authentication token found in any location');
      return null;
    } catch (error) {
      logger.error('Token extraction error:', error);
      return null;
    }
  }
  /**
   * Verify JWT token using official NextAuth 5 decode method
   */
  async verifyToken(token) {
    try {
      if (!token) {
        return { success: false, error: 'No token provided' };
      }

      logger.info(`🔍 Verifying token (length: ${token.length}, first 10 chars: ${token.substring(0, 10)}...)`);
      logger.info(`🔑 Using secret: ${this.secret ? 'present' : 'missing'}`);
      logger.info(`🧂 Using salt: ${this.jwtConfig.salt}`);

      // Use official NextAuth 5 JWT decode method
      const decoded = await decode({
        token: token,
        secret: this.secret,
        salt: this.jwtConfig.salt,
      });

      if (!decoded) {
        logger.warn('❌ Token decode returned null/undefined');
        return { success: false, error: 'Invalid token - decode failed' };
      }

      logger.info('✅ Token decoded successfully');
      logger.info(`👤 User ID: ${decoded.sub}`);
      logger.info(`📧 Email: ${decoded.email}`);
      logger.info(`⏰ Expires: ${decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'no expiration'}`);

      // Validate required fields
      if (!decoded.sub) {
        logger.warn('❌ Token missing user ID (sub field)');
        return { success: false, error: 'Token missing user ID' };
      }

      // Check token expiration
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        logger.warn(`❌ Token expired: ${new Date(decoded.exp * 1000).toISOString()}`);
        return { success: false, error: 'Token expired' };
      }

      // Return user session data
      const user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        username: decoded.username,
        isVerified: decoded.isVerified,
        exp: decoded.exp,
        iat: decoded.iat
      };

      logger.info(`✅ Token verification successful for user: ${user.email}`);
      return { success: true, user };

    } catch (error) {
      logger.error('JWT verification error:', error);
      logger.error('Error name:', error.name);
      logger.error('Error message:', error.message);
      return { success: false, error: `Token verification failed: ${error.message}` };
    }
  }
  /**
   * Socket.IO connection authentication middleware
   * Official NextAuth 5 integration with user-friendly error handling
   */
  async authenticateConnection(socket, next) {
    try {
      const startTime = Date.now();
      const clientInfo = {
        id: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      };
      
      logger.info(`🔐 Authentication attempt from ${clientInfo.ip} - ${clientInfo.id}`);
      
      // Extract token from multiple sources
      const token = this.extractToken(socket);
      if (!token) {
        logger.warn(`❌ No authentication token - ${clientInfo.id}`);
        
        // User-friendly error message
        const error = new Error('Authentication required. Please sign in and refresh the page.');
        error.data = { 
          code: 'NO_TOKEN',
          message: 'Please sign in to access real-time features',
          action: 'refresh_and_signin'
        };
        return next(error);
      }

      // Verify token using NextAuth 5 official method
      const verification = await this.verifyToken(token);
      if (!verification.success) {
        logger.warn(`❌ Token verification failed: ${verification.error} - ${clientInfo.id}`);
        
        // User-friendly error messages based on error type
        let userMessage = 'Authentication failed. Please sign in again.';
        let errorCode = 'AUTH_FAILED';
        
        if (verification.error.includes('expired')) {
          userMessage = 'Your session has expired. Please sign in again.';
          errorCode = 'TOKEN_EXPIRED';
        } else if (verification.error.includes('Invalid token')) {
          userMessage = 'Invalid session. Please sign in again.';
          errorCode = 'INVALID_TOKEN';
        }
        
        const error = new Error(userMessage);
        error.data = {
          code: errorCode,
          message: userMessage,
          action: 'signin_required'
        };
        return next(error);
      }

      // Successfully authenticated - attach user data to socket
      socket.user = verification.user;
      socket.authenticated = true;

      const duration = Date.now() - startTime;
      logger.info(`✅ User authenticated: ${verification.user.email} (${verification.user.id}) - ${socket.id} - ${duration}ms`);

      next();

    } catch (error) {
      logger.error('Authentication middleware error:', error);
      next(new Error('Authentication system error'));
    }
  }

  /**
   * Middleware for authenticating specific events
   */
  async authenticateEvent(socket, eventName, callback) {
    if (!socket.authenticated || !socket.user) {
      logger.warn(`❌ Event ${eventName} rejected: User not authenticated - ${socket.id}`);
      if (callback) callback({ error: 'Authentication required' });
      return false;
    }

    // Re-verify token periodically for long-lived connections
    const tokenAge = Date.now() / 1000 - (socket.user.iat || 0);
    if (tokenAge > 3600) { // Re-verify if token is older than 1 hour
      const token = this.extractToken(socket);
      if (token) {
        const verification = await this.verifyToken(token);
        if (!verification.success) {
          logger.warn(`❌ Token re-verification failed for event ${eventName} - ${socket.id}`);
          socket.emit('auth_error', { message: 'Session expired, please re-authenticate' });
          return false;
        }
        socket.user = verification.user;
      }
    }

    return true;
  }

  /**
   * Get user session from socket
   */
  getUser(socket) {
    return socket.authenticated ? socket.user : null;
  }

  /**
   * Check if user has specific permissions (for future RBAC implementation)
   */
  hasPermission(socket, permission) {
    if (!socket.authenticated || !socket.user) {
      return false;
    }

    // Basic implementation - can be extended for role-based access
    return true;
  }
}

// Create singleton instance
const authMiddleware = new NextAuthSocketMiddleware();

// Express middleware for HTTP routes (health checks, etc.)
const httpAuthMiddleware = async (req, res, next) => {
  try {
    // Check for internal API key first (for API-to-API communication)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const providedKey = authHeader.substring(7);
      const expectedKey = process.env.INTERNAL_API_KEY || process.env.SOCKETIO_API_KEY || 'dev-key';
      
      if (providedKey === expectedKey) {
        // Internal API call - set a system user
        req.user = { 
          id: 'system', 
          name: 'System', 
          email: 'system@internal', 
          isSystem: true 
        };
        return next();
      }
    }

    // Extract token from various sources for user authentication
    let token = null;
    
    // From cookies
    if (req.headers.cookie) {
      const tokenMatch = req.headers.cookie.match(/next-auth\.session-token=([^;]+)/);
      if (tokenMatch) {
        token = decodeURIComponent(tokenMatch[1]);
      }
    }

    // From authorization header (NextAuth JWT)
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7);
      // Only treat as NextAuth token if it's not the API key
      const expectedKey = process.env.INTERNAL_API_KEY || process.env.SOCKETIO_API_KEY || 'dev-key';
      if (bearerToken !== expectedKey) {
        token = bearerToken;
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const verification = await authMiddleware.verifyToken(token);
    if (!verification.success) {
      return res.status(401).json({ error: `Authentication failed: ${verification.error}` });
    }

    req.user = verification.user;
    next();

  } catch (error) {
    logger.error('HTTP auth middleware error:', error);
    res.status(500).json({ error: 'Authentication system error' });
  }
};

module.exports = {
  authMiddleware,
  httpAuthMiddleware,
  NextAuthSocketMiddleware
};
