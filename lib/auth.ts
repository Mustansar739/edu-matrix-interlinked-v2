// ==========================================
// NEXTAUTH 5 MAIN CONFIGURATION WITH PRISMA ADAPTER - PRODUCTION READY
// ==========================================
/**
 * NextAuth v5 Configuration with Prisma Adapter
 * 
 * This is the main NextAuth configuration file that combines:
 * 1. Edge-compatible base configuration from auth.config.ts
 * 2. Prisma database adapter (not edge-compatible, hence separate)
 * 3. Production-ready session and cookie configurations
 * 4. JWT strategy for both edge compatibility and Socket.IO integration
 * 
 * ARCHITECTURE PATTERN:
 * - auth.config.ts: Edge-compatible settings (providers, callbacks, pages)
 * - lib/auth.ts: Full server-side config with database adapter
 * 
 * USAGE:
 * - auth(): Server-side authentication check in React Server Components
 * - handlers: { GET, POST } for API routes (/api/auth/[...nextauth])
 * - signIn(), signOut(): Server actions for authentication
 * 
 * @see https://authjs.dev/getting-started/installation?framework=next.js
 * @see https://authjs.dev/getting-started/adapters/prisma
 */

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import authConfig from "@/auth.config"

/**
 * NextAuth v5 Configuration with Prisma Adapter
 * 
 * This configuration follows the official NextAuth v5 pattern:
 * 1. Imports the edge-compatible base configuration from auth.config.ts
 * 2. Adds the Prisma adapter (not edge-compatible)
 * 3. Forces JWT strategy for edge compatibility and Socket.IO integration
 * 4. Configures production-ready cookie settings
 * 
 * The exported functions (auth, handlers, signIn, signOut) are used throughout the app:
 * - auth(): Server-side authentication check
 * - handlers: { GET, POST } for API routes
 * - signIn(), signOut(): Authentication actions
 */

// Initialize NextAuth with the configuration
export const { handlers, auth, signIn, signOut } = (NextAuth as any)({
  // Import the edge-compatible base configuration from auth.config.ts
  // This includes providers, callbacks, pages, and event handlers
  ...authConfig,
  
  // ==========================================
  // DATABASE ADAPTER CONFIGURATION
  // ==========================================
  // Add the Prisma adapter (not edge-compatible, so not in auth.config.ts)
  // This enables database sessions, user management, and account linking
  adapter: PrismaAdapter(prisma),
  
  // ==========================================
  // SESSION STRATEGY CONFIGURATION
  // ==========================================
  // Force JWT strategy for edge compatibility and Socket.IO integration
  // This ensures sessions work in both edge and serverless environments
  // while maintaining compatibility with real-time features
  session: {
    strategy: "jwt" as const,      // Use JWTs instead of database sessions
    maxAge: 30 * 24 * 60 * 60,     // 30 days session lifetime
    updateAge: 24 * 60 * 60        // Refresh session if older than 24 hours
  },
  
  // ==========================================
  // JWT TOKEN CONFIGURATION
  // ==========================================
  // Configure JWT token lifetime to match session settings
  // Ensures consistent token expiration across the application
  jwt: {
    maxAge: 30 * 24 * 60 * 60,     // 30 days token lifetime (matches session)
  },

  // ==========================================
  // PRODUCTION-READY COOKIE CONFIGURATION
  // ==========================================
  // Optimized cookie settings for both development and production environments
  // Handles public IP development access and secure production deployment
  cookies: {
    sessionToken: {
      // Use secure naming convention in production
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token`    // Secure prefix for HTTPS
        : `next-auth.session-token`,            // Standard name for development
      
      options: {
        // CRITICAL: Allow client-side access for Socket.IO authentication
        // This is required for real-time features to access the session token
        httpOnly: false,
        
        // CSRF protection while allowing legitimate cross-site requests
        // 'lax' provides good security while maintaining functionality
        sameSite: 'lax' as const,
        
        // Available site-wide for all routes and components
        path: '/',
        
        // HTTPS enforcement in production, HTTP allowed in development
        secure: process.env.NODE_ENV === 'production',
        
        // No domain restriction - allows access via public IP in development
        // and proper domain handling in production
        domain: undefined
      }
    }
  },

  // ==========================================
  // DEBUGGING CONFIGURATION
  // ==========================================
  // Enable detailed logging in development for troubleshooting
  // Automatically disabled in production for security and performance
  debug: process.env.NODE_ENV === 'development'
})
