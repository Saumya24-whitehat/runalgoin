/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  daysRemaining?: number
  planType?: string
  expiryDate?: string
  renewUrl?: string
}

const SubscriptionExpiryEmail = ({
  name = 'there',
  daysRemaining = 7,
  planType = 'Pro',
  expiryDate = '',
  renewUrl = 'https://optionworld.tech/plans',
}: Props) => {
  const dayLabel = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`
  const preview =
    daysRemaining <= 1
      ? `Your OptionWorld ${planType} plan expires tomorrow`
      : `Your OptionWorld ${planType} plan expires in ${dayLabel}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your subscription is ending soon</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Just a friendly reminder — your <strong>OptionWorld {planType}</strong> subscription
            will expire in <strong>{dayLabel}</strong>
            {expiryDate ? ` on ${expiryDate}` : ''}.
          </Text>
          <Text style={text}>
            Renew now to keep uninterrupted access to real-time option chains, advanced analytics,
            strategy builder, and everything else on OptionWorld.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={renewUrl}>
              Renew Subscription
            </Button>
          </Section>
          <Text style={footer}>
            If you have already renewed or believe this is a mistake, you can safely ignore this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionExpiryEmail,
  subject: (data: Props) => {
    const d = data?.daysRemaining ?? 7
    if (d <= 1) return 'Your OptionWorld subscription expires tomorrow'
    return `Your OptionWorld subscription expires in ${d} days`
  },
  displayName: 'Subscription Expiry Reminder',
  previewData: {
    name: 'Rahul',
    daysRemaining: 7,
    planType: 'Pro',
    expiryDate: '22 Jul 2026',
    renewUrl: 'https://optionworld.tech/plans',
  },
} satisfies TemplateEntry

export default SubscriptionExpiryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f1720',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#0f1720',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
