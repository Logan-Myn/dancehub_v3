import React from 'react';
import { Button, Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface PreRegistrationPaymentFailedEmailProps {
  memberName: string;
  communityName: string;
  communityUrl: string;
  membershipPrice: number;
  currency?: string;
  failureReason?: string;
  updatePaymentUrl: string;
}

export const PreRegistrationPaymentFailedEmail: React.FC<PreRegistrationPaymentFailedEmailProps> = ({
  memberName,
  communityName,
  communityUrl,
  membershipPrice,
  currency = 'USD',
  failureReason,
  updatePaymentUrl,
}) => {
  const preview = `Action Required: Payment Failed for ${communityName}`;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  return (
    <BaseLayout preview={preview} emailType="transactional">
      <Heading style={{ ...EMAIL_STYLES.heading, textAlign: 'center' }}>
        Action Required: Payment Issue
      </Heading>

      <Text style={EMAIL_STYLES.paragraph}>
        Hi {memberName},
      </Text>

      <Text style={EMAIL_STYLES.paragraph}>
        We tried to charge your saved payment method for your <strong>{communityName}</strong> membership,
        but unfortunately, the payment was declined.
      </Text>

      <Section style={{
        backgroundColor: '#fef2f2',
        borderLeft: `4px solid #ef4444`,
        padding: '20px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#991b1b' }}>
          ❌ Payment Failed
        </Text>
        <Text style={{ fontSize: '14px', margin: '0 0 12px 0' }}>
          Amount: <strong>{formatPrice(membershipPrice)}</strong>
        </Text>
        {failureReason && (
          <Text style={{ fontSize: '14px', margin: '0', color: EMAIL_COLORS.textLight }}>
            Reason: {failureReason}
          </Text>
        )}
      </Section>

      <Text style={EMAIL_STYLES.paragraph}>
        Don't worry – this happens sometimes. Here are the most common reasons and how to fix them:
      </Text>

      <Section style={{
        backgroundColor: EMAIL_COLORS.background,
        borderRadius: '8px',
        padding: '20px',
        margin: '24px 0',
      }}>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li style={{ fontSize: '14px', marginBottom: '12px' }}>
            <strong>Insufficient funds:</strong> Make sure your account has enough balance to cover the charge.
          </li>
          <li style={{ fontSize: '14px', marginBottom: '12px' }}>
            <strong>Expired card:</strong> Check if your card has expired and needs to be updated.
          </li>
          <li style={{ fontSize: '14px', marginBottom: '12px' }}>
            <strong>Incorrect card details:</strong> Verify that your billing address and card information are correct.
          </li>
          <li style={{ fontSize: '14px', marginBottom: '12px' }}>
            <strong>Bank security:</strong> Your bank may have flagged this as a suspicious transaction. Contact them to authorize it.
          </li>
        </ul>
      </Section>

      <Section style={{
        backgroundColor: '#fef3c7',
        borderLeft: `4px solid #f59e0b`,
        padding: '16px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          ⏰ What Happens Now:
        </Text>
        <Text style={{ fontSize: '14px', margin: '4px 0' }}>
          You have <strong>7 days</strong> to update your payment method. We'll automatically retry
          charging your card. If payment isn't successful within 7 days, your membership will be cancelled.
        </Text>
      </Section>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={updatePaymentUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
            backgroundColor: '#ef4444',
          }}
        >
          Update Payment Method
        </Button>
      </div>

      <div style={{ textAlign: 'center', margin: '16px 0' }}>
        <Button
          href={communityUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
            backgroundColor: EMAIL_COLORS.textLight,
          }}
        >
          View Community
        </Button>
      </div>

      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: EMAIL_COLORS.textLight }}>
        Need help? We're here for you. Just reply to this email and we'll assist you in resolving
        this issue as quickly as possible.
      </Text>

      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', fontWeight: '600', marginTop: '24px' }}>
        Best regards,<br />
        The {communityName} Team
      </Text>
    </BaseLayout>
  );
};
