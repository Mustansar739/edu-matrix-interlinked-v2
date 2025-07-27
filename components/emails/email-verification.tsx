import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components'
import * as React from 'react'

interface EmailVerificationTemplateProps {
  name: string
  verificationUrl: string
}

export const EmailVerificationTemplate = ({
  name,
  verificationUrl,
}: EmailVerificationTemplateProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Edu Matrix Interlinked - Verify your account to begin your educational journey</Preview>    <Body style={main}>
      <Container style={container}>        <Section style={content}>          <Heading style={h1}>
            Edu Matrix Interlinked
          </Heading>
          
          <Text style={subtitle}>
            Your Next-Generation Educational Platform
          </Text>
          
          <Text style={greeting}>
            Welcome, {name}! 👋
          </Text>
          
          <Text style={text}>
            Verify your email to unlock Edu Matrix Interlinked&apos;s full potential. This ensures your account is secure and ready for your educational journey.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              🔐 Verify My Account
            </Button>
          </Section>
          
          <Text style={altLinkText}>
            Having trouble? <a href={verificationUrl} style={{color: '#3b82f6', textDecoration: 'underline'}}>Click here to verify</a>
          </Text>
          
          <Text style={securityText}>
            <strong>⏰ Security Notice:</strong> Link expires in 24 hours. If you didn&apos;t create this account, ignore this email.
          </Text>
          
          <Text style={signature}>
            Welcome to the future of education,<br />
            <strong>The Edu Matrix Interlinked Team</strong>
          </Text>
          
          <Text style={footerInfo}>
            © 2025 Edu Matrix Interlinked. Need help? <strong>support@edumatrixinterlinked.com</strong>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

// Professional Brand-Aligned Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","Inter",Roboto,"Helvetica Neue",Arial,sans-serif',
  lineHeight: '1.6',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
}

const content = {
  padding: '40px 48px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const subtitle = {
  color: '#64748b',
  fontSize: '16px',
  fontWeight: '400',
  margin: '0 0 32px',
  textAlign: 'center' as const,
  fontStyle: 'italic',
}

const greeting = {
  color: '#1e293b',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  margin: '0',
  boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.25)',
}

const altLinkText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '20px 0',
  textAlign: 'center' as const,
}

const securityText = {
  color: '#92400e',
  backgroundColor: '#fef3c7',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '12px',
  borderRadius: '6px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const signature = {
  color: '#1e293b',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 20px',
  textAlign: 'center' as const,
}

const footerInfo = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  margin: '0',
}
