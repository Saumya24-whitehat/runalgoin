/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'

interface Props {
  siteName?: string
  siteUrl?: string
  token: string
}

export const ReauthenticationEmail = ({ siteName = 'OptionWorld', siteUrl = 'https://optionworld.tech', token }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code: {token}</Preview>
    <Body style={body}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={brandMark}>Option<span style={brandAccent}>World</span></Text>
          <Text style={brandTag}>Smarter Options Analytics</Text>
        </Section>
        <Container style={card}>
          <Heading style={h1}>Verification code 🔒</Heading>
          <Text style={lead}>Enter this code to confirm the action on your {siteName} account. It expires in 5 minutes.</Text>
          <Section style={codeBox}>
            <Text style={codeText}>{token}</Text>
          </Section>
          <Hr style={hr} />
          <Text style={muted}>If you didn't request this, ignore this email or <Link href={`${siteUrl}/support`} style={linkStyle}>contact support</Link>.</Text>
        </Container>
        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} {siteName} · <Link href={siteUrl} style={footerLink}>optionworld.tech</Link></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const body = { backgroundColor: '#f4f6f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', margin: 0, padding: '32px 0' }
const wrapper = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { textAlign: 'center' as const, padding: '8px 0 24px' }
const brandMark = { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }
const brandAccent = { color: '#17b3d1' }
const brandTag = { fontSize: '12px', color: '#64748b', margin: '4px 0 0', letterSpacing: '0.5px', textTransform: 'uppercase' as const }
const card = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.3px' }
const lead = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 8px' }
const codeBox = { backgroundColor: '#f0fbfd', border: '2px dashed #17b3d1', borderRadius: '10px', padding: '20px', textAlign: 'center' as const, margin: '24px 0' }
const codeText = { fontSize: '32px', fontWeight: 800, letterSpacing: '8px', color: '#0e8fa8', margin: 0, fontFamily: 'Menlo, Monaco, Consolas, monospace' }
const muted = { fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '16px 0 0' }
const linkStyle = { color: '#17b3d1', textDecoration: 'underline' }
const hr = { borderColor: '#e2e8f0', margin: '28px 0' }
const footer = { textAlign: 'center' as const, padding: '24px 16px' }
const footerText = { fontSize: '12px', color: '#94a3b8', margin: '4px 0' }
const footerLink = { color: '#64748b', textDecoration: 'none' }
