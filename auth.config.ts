// ==========================================
// NEXTAUTH 5 EDGE-COMPATIBLE BASE CONFIGURATION - PRODUCTION READY
// ==========================================
/**
 * NextAuth v5 Edge-Compatible Base Configuration
 * 
 * This configuration contains only edge-compatible settings that can run
 * in both serverless and edge runtime environments. All Node.js specific
 * operations are handled in lib/auth-server.ts
 * 
 * ARCHITECTURE PATTERN:
 * - This file: Edge-compatible settings (providers, callbacks, pages)
 * - lib/auth-server.ts: Full server configuration with Node.js dependencies
 * 
 * INCLUDED FEATURES:
 * - Credentials provider with registration and login
 * - Comprehensive JWT and session callbacks with error handling
 * - Email verification workflow
 * - Production-ready error handling and logging
 * 
 * SECURITY FEATURES:
 * - Rate limiting for login and registration attempts
 * - Comprehensive audit logging
 * - Robust session validation
 * 
 * @see https://authjs.dev/getting-started/installation?framework=next.js
 * @see https://authjs.dev/guides/providers/credentials
 */

import Credentials from "next-auth/providers/credentials"

// ==========================================
// TYPESCRIPT INTERFACE DEFINITIONS
// ==========================================
/**
 * Custom TypeScript interfaces for NextAuth v5 compatibility
 * These extend the default NextAuth types with our application-specific fields
 */

// User object structure for authentication flows
interface CustomUser {
  id: string
  email: string
  name: string
  username?: string | null
  isVerified?: boolean
  image?: string | null
}

// Account linking information for OAuth providers
interface CustomAccount {
  provider: string
  type: string
  providerAccountId: string
  access_token?: string
  refresh_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
  id_token?: string
  session_state?: string
}

// OAuth provider profile information
interface CustomProfile {
  sub?: string
  name?: string
  email?: string
  picture?: string
  [key: string]: any
}

// Client-side session object structure
interface CustomSession {
  user: {
    id: string
    email: string
    name: string
    username?: string | null
    isVerified?: boolean
    image?: string | null
  }
  expires: string
}

// JWT token payload structure
interface CustomJWT {
  sub?: string           // Standard JWT subject (user ID)
  id?: string           // Backup user ID field
  email?: string
  name?: string
  username?: string | null
  isVerified?: boolean
  iat?: number          // Issued at timestamp
  exp?: number          // Expiration timestamp
  jti?: string          // JWT ID
}

const authConfig = {
  // ==========================================
  // PROVIDERS CONFIGURATION
  // ==========================================
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        action: { label: "Action", type: "text" }
      },
      async authorize(credentials) {
        try {
          console.log('[NextAuth Debug] authorize called with:', { 
            email: credentials?.email, 
            action: credentials?.action,
            hasPassword: !!credentials?.password 
          })

          if (!credentials?.email || !credentials?.password) {
            console.log('[NextAuth Debug] Missing email or password')
            return null
          }

          const { email, password, name, action } = credentials

          // Import server utilities dynamically (Node.js runtime only)
          const { 
            handleUserRegistration, 
            handleUserLogin 
          } = await import('@/lib/auth-server')

          try {
            // Handle Registration
            if (action === "register") {
              if (!name) {
                console.log('[NextAuth Debug] Missing name for registration')
                return null
              }

              const result = await handleUserRegistration(
                email as string, 
                password as string, 
                name as string
              )

              if (result.success) {
                return {
                  id: result.user.id,
                  email: result.user.email,
                  name: result.user.name,
                  username: result.user.username,
                  isVerified: result.user.isVerified
                }
              }
              
              return null
            }

            // Handle Login
            const user = await handleUserLogin(email as string, password as string)
            
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              username: user.username,
              isVerified: user.isVerified,
              image: user.image
            }

          } catch (authError) {
            console.log('[NextAuth Debug] Authentication error:', authError)
            return null
          }

        } catch (error) {
          console.error('[NextAuth Debug] authorize error:', error)
          return null
        }
      }
    })
  ],

  // ==========================================
  // PAGES CONFIGURATION
  // ==========================================
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },

  // ==========================================
  // CALLBACKS CONFIGURATION
  // ==========================================
  callbacks: {
    async signIn({ user, account, profile, email, credentials }: { 
      user: CustomUser;
      account: CustomAccount | null;
      profile?: CustomProfile;
      email?: { verificationRequest?: boolean };
      credentials?: Record<string, any>;
    }) {
      // Enhanced sign-in validation with comprehensive error handling
      if (!user) {
        console.error('[AUTH] SignIn callback: No user provided')
        return false
      }
      
      if (!user.id) {
        console.error('[AUTH] SignIn callback: User missing ID field')
        return false
      }
      
      if (!user.email) {
        console.error('[AUTH] SignIn callback: User missing email field')
        return false
      }
      
      console.log('[AUTH] SignIn successful for user:', user.id)
      return true
    },
    
    async session({ session, token }: { 
      session: CustomSession; 
      token: CustomJWT;
    }) {
      // CRITICAL: Robust session data mapping with error handling
      try {
        if (!token) {
          console.error('[AUTH] Session callback: No token provided')
          return session
        }
        
        // PRIMARY FIX: Ensure user.id is ALWAYS present
        if (token.sub) {
          session.user.id = token.sub
        } else {
          console.error('[AUTH] Session callback: Missing user ID in token.sub')
          // Fallback: try to get ID from token.id if available
          if (token.id) {
            session.user.id = token.id as string
          }
        }
        
        // Map all user fields with proper fallbacks
        session.user.email = token.email || session.user.email || ''
        session.user.name = token.name || session.user.name || ''
        
        if (token.username) {
          session.user.username = token.username
        }
        
        if (token.isVerified !== undefined) {
          session.user.isVerified = token.isVerified
        }
        
        // Validation: Ensure critical fields are present
        if (!session.user.id) {
          console.error('[AUTH] Session callback: Failed to set user.id - this will cause 401 errors')
        }
        
        // Debug logging for troubleshooting (PRODUCTION: DISABLED FOR PERFORMANCE)
        if (process.env.NODE_ENV === 'development' && process.env.AUTH_DEBUG === 'true') {
          console.log('[AUTH] Session callback - Token data:', {
            sub: token.sub,
            id: token.id,
            username: token.username,
            email: token.email,
            name: token.name
          })
          console.log('[AUTH] Session callback - Final session user:', {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            username: session.user.username
          })
        }
        
        return session
      } catch (error) {
        console.error('[AUTH] Session callback error:', error)
        return session
      }
    },
    
    async jwt({ token, user }: { 
      token: CustomJWT; 
      user?: CustomUser;
    }) {
      // CRITICAL: Comprehensive JWT token data storage
      try {
        if (user) {
          // PRIMARY FIX: Store user.id in multiple fields for maximum compatibility
          if (user.id) {
            token.sub = user.id  // Standard JWT field for user ID
            token.id = user.id   // Additional backup field
          } else {
            console.error('[AUTH] JWT callback: User missing ID field')
          }
          
          // Store all essential user data
          if (user.email) {
            token.email = user.email
          }
          
          if (user.name) {
            token.name = user.name
          }
          
          if ((user as any).username) {
            token.username = (user as any).username
          }
          
          if ((user as any).isVerified !== undefined) {
            token.isVerified = (user as any).isVerified
          }
          
          // Debug logging for troubleshooting (PRODUCTION: DISABLED FOR PERFORMANCE)
          if (process.env.NODE_ENV === 'development' && process.env.AUTH_DEBUG === 'true') {
            console.log('[AUTH] JWT callback - Storing user data:', {
              id: user.id,
              email: user.email,
              name: user.name,
              username: (user as any).username,
              isVerified: (user as any).isVerified
            })
          }
        }
        
        // Validation: Ensure token has user ID
        if (!token.sub && !token.id) {
          console.error('[AUTH] JWT callback: Token missing user ID - this will cause session issues')
        }
        
        return token
      } catch (error) {
        console.error('[AUTH] JWT callback error:', error)
        return token
      }
    }
  },

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  events: {
    async signIn({ user }: { user: CustomUser }) {
      // Update last login timestamp using dynamic import
      if (user.id) {
        try {
          const { prisma } = await import('@/lib/prisma')
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              lastLogin: new Date(),
              loginCount: { increment: 1 }
            }
          })
        } catch (error) {
          console.error('[AUTH] Failed to update login timestamp:', error)
        }
      }
    }
  }
}

export default authConfig
