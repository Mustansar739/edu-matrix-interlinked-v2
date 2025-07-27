// ==========================================
// NEXTAUTH 5 UTILITIES FOR SOCKET.IO SERVER
// ==========================================
// Helper utilities for NextAuth 5 integration

const { decode } = require('@auth/core/jwt');
const { logger } = require('./logger');

/**
 * NextAuth 5 JWT Utilities
 */
class NextAuthUtils {
  constructor() {
    this.secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    this.salt = 'authjs.session-token';
    
    if (!this.secret) {
      throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is required');
    }
  }

  /**
   * Decode NextAuth 5 JWT token using official method
   */
  async decodeToken(token) {
    try {
      const decoded = await decode({
        token: token,
        secret: this.secret,
        salt: this.salt,
      });

      return decoded;
    } catch (error) {
      logger.error('Token decode error:', error);
      return null;
    }
  }

  /**
   * Validate token structure and expiration
   */
  validateToken(decoded) {
    if (!decoded) {
      return { valid: false, error: 'Invalid token' };
    }

    // Check required fields
    if (!decoded.sub) {
      return { valid: false, error: 'Token missing user ID' };
    }

    // Check expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true };
  }

  /**
   * Extract user session from decoded token
   */
  extractUserSession(decoded) {
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      username: decoded.username,
      isVerified: decoded.isVerified,
      exp: decoded.exp,
      iat: decoded.iat,
      sessionExpires: decoded.exp ? new Date(decoded.exp * 1000) : null,
    };
  }

  /**
   * Check if token needs refresh (approaching expiration)
   */
  needsRefresh(decoded, refreshThreshold = 24 * 60 * 60) { // 24 hours default
    if (!decoded.exp) return false;
    
    const now = Date.now() / 1000;
    const timeToExpiry = decoded.exp - now;
    
    return timeToExpiry < refreshThreshold;
  }

  /**
   * Get token age in seconds
   */
  getTokenAge(decoded) {
    if (!decoded.iat) return null;
    return Math.floor(Date.now() / 1000) - decoded.iat;
  }

  /**
   * Create user context for Socket.IO events
   */
  createUserContext(decoded) {
    const user = this.extractUserSession(decoded);
    const tokenAge = this.getTokenAge(decoded);
    const needsRefresh = this.needsRefresh(decoded);

    return {
      ...user,
      tokenAge,
      needsRefresh,
      isAuthenticated: true,
    };
  }
}

/**
 * Connection tracking utilities
 */
class ConnectionTracker {
  constructor() {
    this.userConnections = new Map(); // userId -> Set of socketIds
    this.socketUsers = new Map(); // socketId -> userId
  }

  /**
   * Track user connection
   */
  addConnection(userId, socketId) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(socketId);
    this.socketUsers.set(socketId, userId);

    logger.debug(`User ${userId} connected with socket ${socketId}`);
  }

  /**
   * Remove connection
   */
  removeConnection(socketId) {
    const userId = this.socketUsers.get(socketId);
    if (userId) {
      const connections = this.userConnections.get(userId);
      if (connections) {
        connections.delete(socketId);
        if (connections.size === 0) {
          this.userConnections.delete(userId);
        }
      }
      this.socketUsers.delete(socketId);
      
      logger.debug(`Socket ${socketId} disconnected from user ${userId}`);
    }
  }

  /**
   * Get all socket IDs for a user
   */
  getUserConnections(userId) {
    return Array.from(this.userConnections.get(userId) || []);
  }

  /**
   * Get user ID for a socket
   */
  getSocketUser(socketId) {
    return this.socketUsers.get(socketId);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.userConnections.has(userId) && this.userConnections.get(userId).size > 0;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalUsers: this.userConnections.size,
      totalConnections: this.socketUsers.size,
      multipleConnectionUsers: Array.from(this.userConnections.entries())
        .filter(([, connections]) => connections.size > 1).length
    };
  }
}

// Create singleton instances
const nextAuthUtils = new NextAuthUtils();
const connectionTracker = new ConnectionTracker();

module.exports = {
  nextAuthUtils,
  connectionTracker,
  NextAuthUtils,
  ConnectionTracker
};
