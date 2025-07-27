import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production-ready configuration for file uploads
  experimental: {
    // Enable server actions for better file handling
    serverActions: {
      allowedOrigins: ['*'],
      bodySizeLimit: '10mb'
    }
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/vlsjmvsqt/**'
      }
    ]
  },

  // Production-ready headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      // Static assets caching
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },

  // Allow cross-origin requests for development
  allowedDevOrigins: [
    '*',
    '80.225.220.94'
  ],

  // Turbopack configuration (moved from deprecated 'turbo' to 'turbopack')
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js'
      }
    }
  }
};

export default nextConfig;
