# 📧 Production-Ready Email Service Configuration Guide

## Overview
This guide helps you configure the email service for production-ready operation using Resend.

## Required Environment Variables

Add these variables to your `.env.local` file:

```env
# Resend Email Service Configuration (REQUIRED)
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Edu Matrix Interlinked
NEXTAUTH_URL=http://localhost:3000

# Optional: For testing mode (if using test API key)
RESEND_VERIFIED_EMAIL=your-verified-email@gmail.com
```

## Setup Steps

### 1. Get Resend API Key
1. Go to [https://resend.com](https://resend.com)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)

### 2. Domain Configuration

#### For Testing (Development)
- Use the test API key provided by Resend
- Emails will only be sent to your verified email address
- Set `RESEND_VERIFIED_EMAIL` to your verified email

#### For Production
1. Go to [https://resend.com/domains](https://resend.com/domains)
2. Add your domain (e.g., `yourdomain.com`)
3. Configure DNS records as instructed
4. Verify the domain
5. Use an email from your verified domain in `RESEND_FROM_EMAIL`

### 3. Testing the Setup

Use the health check endpoint:
```bash
curl http://localhost:3000/api/email/health
```

## Current Service Status

The email service automatically detects:
- **Testing Mode**: When using test API key (emails restricted to verified address)
- **Production Mode**: When domain is verified (emails can be sent to any address)

## Error Handling

The service provides user-friendly error messages for:
- Domain verification requirements
- Rate limiting
- Network issues
- Configuration errors

## Troubleshooting

### Common Issues

1. **403 Error: "You can only send testing emails to your own email address"**
   - This means you're using a test API key
   - Either verify a domain or use the testing mode with `RESEND_VERIFIED_EMAIL`

2. **API Key Format Error**
   - Ensure your API key starts with `re_`
   - Check for extra spaces or characters

3. **Missing Environment Variables**
   - All four required variables must be set
   - Check your `.env.local` file

### Development vs Production

- **Development**: Use test API key, emails redirect to verified address
- **Production**: Use production API key with verified domain

## Security Notes

- Never commit API keys to version control
- Use different API keys for development and production
- Regularly rotate API keys
- Monitor email sending limits and usage

## Support

For email delivery issues:
1. Check the email service status via API
2. Verify environment variables are correct
3. Check Resend dashboard for delivery logs
4. Contact support if domain verification issues persist
