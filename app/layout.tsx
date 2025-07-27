/**
 * @fileoverview Root Layout Component - Production Ready Layout System
 * @module App/Layout
 * @category Core Layout
 * @version 3.0.0
 * 
 * ==========================================
 * PRODUCTION-READY ROOT LAYOUT SYSTEM
 * ==========================================
 * 
 * This is the main layout component that wraps the entire application.
 * It provides global providers, navigation, monitoring, and core styling
 * for the Edu Matrix Interlinked platform.
 * 
 * KEY FEATURES:
 * - Next.js 15 App Router optimized layout
 * - Global provider system for state management
 * - Real-time Socket.IO integration
 * - Authentication and authorization context
 * - Redux state management with persistence
 * - React Query for server state management
 * - Toast notifications system
 * - Health monitoring and error tracking
 * - Responsive design foundation
 * - Accessibility compliance (WCAG 2.1)
 * 
 * PROVIDER HIERARCHY:
 * 1. AuthProvider - Authentication context and session management
 * 2. QueryProvider - React Query for API state management
 * 3. ReduxProvider - Global client state management
 * 4. SocketProvider - Real-time WebSocket connections
 * 5. FollowStatusProvider - Centralized follow status management
 * 6. UnreadCountProvider - Centralized notification counts
 * 7. ToastProvider - Global toast notification system
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Font optimization with Next.js font system
 * - Provider memoization and optimization
 * - Socket connection management
 * - Error boundary protection
 * - Health monitoring for production debugging
 * 
 * ACCESSIBILITY FEATURES:
 * - Semantic HTML structure
 * - Screen reader support
 * - Keyboard navigation
 * - High contrast support
 * - Reduced motion preferences
 * 
 * @author GitHub Copilot
 * @since 2025-01-19
 * @lastModified 2025-01-19
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { UnreadCountProvider } from "@/components/providers/UnreadCountProvider";
import { FollowStatusProvider } from "@/contexts/FollowStatusContext";
import ClientHealthMonitor from "@/components/client-health-monitor";
import { SocketProvider } from "@/lib/socket/socket-context-clean";
import { SocketConnectionStatus } from "@/components/socket-status-indicator";
import GlobalNavbar from "@/components/navbar/GlobalNavbar";
import { Toaster } from "sonner";
import { ToastProvider } from "@/components/ui/use-toast";
import "./globals.css";

// Font optimization for better performance and loading
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Improved font loading performance
  preload: true,   // Preload critical font
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Improved font loading performance
  preload: false,  // Only load when needed
});

// Enhanced metadata for better SEO and PWA support
export const metadata: Metadata = {
  title: {
    template: "%s | Edu Matrix Interlinked",
    default: "Edu Matrix Interlinked | Educational Social Platform",
  },
  description: "Comprehensive educational social platform connecting students, educators, and institutions with real-time collaboration, course management, and professional networking.",
  keywords: [
    "education",
    "e-learning",
    "student network",
    "online courses",
    "institutional management",
    "educational platform",
    "social learning",
    "academic collaboration"
  ],
  authors: [{ name: "Edu Matrix Interlinked Team" }],
  creator: "Edu Matrix Interlinked",
  publisher: "Edu Matrix Interlinked",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Edu Matrix Interlinked | Educational Social Platform",
    description: "Connect, learn, and grow with the comprehensive educational platform for students and educators.",
    siteName: "Edu Matrix Interlinked",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Edu Matrix Interlinked Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Edu Matrix Interlinked | Educational Social Platform",
    description: "Connect, learn, and grow with the comprehensive educational platform for students and educators.",
    images: ["/og-image.jpg"],
    creator: "@edumatrixteam",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: '/logo-icon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: "/manifest.json",
  verification: {
    google: process.env.GOOGLE_VERIFICATION,
    other: {
      "msvalidate.01": process.env.BING_VERIFICATION || "",
    },
  },
};

// Enhanced viewport configuration for better mobile experience
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  colorScheme: 'light dark',
};

/**
 * Root Layout Component
 * 
 * Provides the foundational structure for the entire application including:
 * - Provider hierarchy for state management
 * - Global navigation and monitoring
 * - Font and styling configuration
 * - Accessibility and SEO optimization
 * 
 * @param children - Page content to be rendered
 * @returns JSX.Element - Complete application layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className="scroll-smooth" // Smooth scrolling for better UX
      suppressHydrationWarning={true} // Prevent hydration warnings in dev
    >
      <head>
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href="//api.edu-matrix.com" />
        <link rel="dns-prefetch" href="//cdn.edu-matrix.com" />
        
        {/* Prevent FOUC (Flash of Unstyled Content) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                document.documentElement.classList.add(theme);
              } catch (e) {
                console.warn('Theme initialization failed:', e);
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
        suppressHydrationWarning={true}
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>

        {/* Provider hierarchy for global state management */}
        <AuthProvider>
          <QueryProvider>
            <ReduxProvider>
              <SocketProvider>
                <FollowStatusProvider>
                  <UnreadCountProvider>
                    <ToastProvider>
                      {/* Global navigation component */}
                      <GlobalNavbar />
                      
                      {/* Main content area with proper accessibility */}
                      <main 
                        id="main-content" 
                        className="min-h-screen"
                        role="main"
                        tabIndex={-1}
                      >
                        {children}
                      </main>
                      
                      {/* System monitoring and status indicators */}
                      <ClientHealthMonitor />
                      <SocketConnectionStatus />
                      
                      {/* Global toast notification system */}
                      <Toaster 
                        position="top-right" 
                        richColors
                        closeButton
                        duration={4000}
                        className="z-[9999]"
                      />
                    </ToastProvider>
                  </UnreadCountProvider>
                </FollowStatusProvider>
              </SocketProvider>
            </ReduxProvider>
          </QueryProvider>
        </AuthProvider>
        
        {/* Analytics and tracking scripts would go here in production */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics or other tracking scripts */}
            {process.env.NEXT_PUBLIC_GA_ID && (
              <>
                <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                        page_title: document.title,
                        page_location: window.location.href,
                      });
                    `,
                  }}
                />
              </>
            )}
          </>
        )}
      </body>
    </html>
  );
}
