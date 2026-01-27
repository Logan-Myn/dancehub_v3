import React from 'react';
import { Button, Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface PreRegistrationConfirmationEmailProps {
  memberName: string;
  communityName: string;
  communityDescription?: string;
  communityUrl: string;
  openingDate: string;
  membershipPrice: number;
  currency?: string;
}

export const PreRegistrationConfirmationEmail: React.FC<PreRegistrationConfirmationEmailProps> = ({
  memberName,
  communityName,
  communityDescription,
  communityUrl,
  openingDate,
  membershipPrice,
  currency = 'USD',
}) => {
  const preview = `You're pre-registered for ${communityName}!`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  return (
    <BaseLayout preview={preview}>
      <Heading style={{ ...EMAIL_STYLES.heading, textAlign: 'center' }}>
        Pre-Registration Confirmed! ✅
      </Heading>

      <Text style={EMAIL_STYLES.paragraph}>
        Hi {memberName},
      </Text>

      <Text style={EMAIL_STYLES.paragraph}>
        Great news! You've successfully pre-registered for <strong>{communityName}</strong>.
        Your payment method has been saved, and you're all set for when we officially open our doors!
      </Text>

      {communityDescription && (
        <Text style={EMAIL_STYLES.paragraph}>
          {communityDescription}
        </Text>
      )}

      <Section style={{
        backgroundColor: EMAIL_COLORS.background,
        borderRadius: '8px',
        padding: '24px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Important Details:
        </Text>

        <div style={{ marginBottom: '12px' }}>
          <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Opening Date:
          </Text>
          <Text style={{ fontSize: '18px', color: EMAIL_COLORS.primary, fontWeight: '700', margin: '0' }}>
            {formatDate(openingDate)}
          </Text>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Membership Price:
          </Text>
          <Text style={{ fontSize: '18px', color: EMAIL_COLORS.primary, fontWeight: '700', margin: '0' }}>
            {formatPrice(membershipPrice)}/month
          </Text>
        </div>
      </Section>

      <Section style={{
        backgroundColor: '#fef3c7',
        borderLeft: `4px solid #f59e0b`,
        padding: '16px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          ⚠️ What Happens Next:
        </Text>
        <Text style={{ fontSize: '14px', margin: '4px 0' }}>
          On <strong>{formatDate(openingDate)}</strong>, your saved payment method will be automatically
          charged {formatPrice(membershipPrice)}, and you'll receive immediate access to all community features.
        </Text>
      </Section>

      <Section style={{
        backgroundColor: '#f0fdf4',
        borderLeft: `4px solid ${EMAIL_COLORS.success}`,
        padding: '16px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          💡 Need to Cancel?
        </Text>
        <Text style={{ fontSize: '14px', margin: '4px 0' }}>
          No problem! You can cancel your pre-registration at any time before the opening date
          without being charged. Simply visit your pre-registration page.
        </Text>
      </Section>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={communityUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
          }}
        >
          View Community Details
        </Button>
      </div>

      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: EMAIL_COLORS.textLight }}>
        We can't wait to welcome you to {communityName}! If you have any questions before the
        opening date, feel free to reach out by replying to this email.
      </Text>

      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', fontWeight: '600', marginTop: '24px' }}>
        See you soon!<br />
        {communityName}
      </Text>
    </BaseLayout>
  );
};
