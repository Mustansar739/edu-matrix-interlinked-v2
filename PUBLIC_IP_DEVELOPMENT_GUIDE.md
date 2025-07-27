# 🚀 PUBLIC IP DEVELOPMENT SERVER GUIDE

## **Overview**
This guide explains how to run the development server accessible via public IP instead of localhost.

## **Current Configuration**
- **Public IP**: `80.225.220.94`
- **Development Port**: `3000`
- **Access URL**: `http://80.225.220.94:3000`

## **Environment Setup**
```bash
# Current NEXTAUTH_URL configuration
NEXTAUTH_URL=http://80.225.220.94:3000

# Public App URL
NEXT_PUBLIC_APP_URL=https://80.225.220.94
```

## **How to Start Development Server**
```bash
# Start the development server with public IP access
pnpm run dev

# The server will be accessible at:
# http://80.225.220.94:3000
```

## **Package.json Configuration**
```json
{
  "scripts": {
    "dev": "next dev --turbopack -H 0.0.0.0 -p 3000"
  }
}
```

The `-H 0.0.0.0` flag makes the server listen on all network interfaces, allowing external access.

## **Firewall Configuration**
✅ Port 3000 is already open in the firewall:
- Oracle Cloud Security Group: Port 3000 allowed
- VM iptables: Port 3000 allowed

## **Authentication Configuration**
- NextAuth configured for HTTP in development mode
- Cookies configured without domain restrictions for public IP access
- Session strategy: JWT (compatible with public IP access)

## **Testing the Setup**
```bash
# Test server availability
curl -I http://80.225.220.94:3000

# Test API endpoints
curl -I http://80.225.220.94:3000/api/users/me
```

## **Development vs Production**
- **Development**: HTTP on public IP (current setup)
- **Production**: HTTPS with SSL certificates
- **Switching**: Update NEXTAUTH_URL in .env file

## **Security Notes**
- Development server runs over HTTP (not HTTPS)
- Authentication cookies are configured for development
- For production, enable HTTPS and secure cookies

## **Troubleshooting**
1. **Server not accessible**: Check firewall rules
2. **Authentication issues**: Verify NEXTAUTH_URL matches access URL
3. **Cookie problems**: Clear browser cookies and restart server

---
**Last Updated**: July 5, 2025
**Status**: ✅ Working - Development server accessible on public IP
