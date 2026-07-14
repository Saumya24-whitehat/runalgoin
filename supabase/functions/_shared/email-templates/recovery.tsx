/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  siteName: string
  siteUrl: string
  recipient?: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={body}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={brandMark}>Option<span style={brandAccent}>World</span></Text>
          <Text style={brandTag}>Smarter Options Analytics</Text>
        </Section>
        <Container style={card}>
          <Heading style={h1}>Reset your password 🔐</Heading>
          <Text style={lead}>
            We received a request to reset the password for your <strong>{siteName}</strong> account. Click the button below to set a new one. This link expires in 1 hour.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={cta} href={confirmationUrl}>Reset my password</Button>
          </Section>
          <Text style={muted}>
            Or paste this link into your browser:<br />
            <Link href={confirmationUrl} style={linkStyle}>{confirmationUrl}</Link>
          </Text>
          <Hr style={hr} />
          <Text style={muted}>
            {recipient ? <>This request was made for <strong>{recipient}</strong>. </> : null}
            If you didn't request a password reset, you can safely ignore this email — your password will stay the same.
          </Text>
        </Container>
        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} {siteName} · <Link href={siteUrl} style={footerLink}>optionworld.tech</Link></Text>
          <Text style={footerText}>Need help? <Link href={`${siteUrl}/support`} style={footerLink}>Contact support</Link></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const body = { backgroundColor: '#f4f6f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', margin: 0, padding: '32px 0' }
const wrapper = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 24px' }
const brandMark = { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }
const brandAccent = { color: '#17b3d1' }
const brandTag = { fontSize: '12px', color: '#64748b', margin: '4px 0 0', letterSpacing: '0.5px', textTransform: 'uppercase' as const }
const card = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.3px' }
const lead = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 8px' }
const cta = { background: 'linear-gradient(135deg,#17b3d1 0%,#0e8fa8 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 600, padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
const muted = { fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '16px 0 0' }
const linkStyle = { color: '#17b3d1', textDecoration: 'underline', wordBreak: 'break-all' as const }
const hr = { borderColor: '#e2e8f0', margin: '28px 0' }
const footer = { textAlign: 'center' as const, padding: '24px 16px' }
const footerText = { fontSize: '12px', color: '#94a3b8', margin: '4px 0' }
const footerLink = { color: '#64748b', textDecoration: 'none' }
