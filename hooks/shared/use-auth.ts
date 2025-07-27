"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * @fileoverview useAuth Hook - Authentication utilities for all services
 * @module useAuth
 * @category Shared Hooks
 * 
 * @description
 * Shared authentication hook used across all 9 services in EDU Matrix Interlinked
 * Provides consistent auth state and utilities
 */

/**
 * Custom hook for authentication state and utilities
 */
export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const user = session?.user

  const requireAuth = (redirectTo = "/auth/signin") => {
    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push(redirectTo)
      }
    }, [isLoading, isAuthenticated, redirectTo, router])
  }

  return {
    session,
    user,
    status,
    isLoading,
    isAuthenticated,
    requireAuth,
  }
}

/**
 * Hook for protected routes - redirects to signin if not authenticated
 */
export function useRequireAuth(redirectTo = "/auth/signin") {
  const { isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isLoading, isAuthenticated, redirectTo, router])
  
  return { isLoading, isAuthenticated }
}
