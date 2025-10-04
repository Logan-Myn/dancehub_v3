import React from 'react';
import { Button, Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface CommunityOpeningEmailProps {
  memberName: string;
  communityName: string;
  communityDescription?: string;
  communityUrl: string;
  membershipPrice: number;
  currency?: string;
  benefits: string[];
  nextSteps?: Array<{
    title: string;
    description: string;
    url?: string;
  }>;
}

export const CommunityOpeningEmail: React.FC<CommunityOpeningEmailProps> = ({
  memberName,
  communityName,
  communityDescription,
  communityUrl,
  membershipPrice,
  currency = 'USD',
  benefits,
  nextSteps,
}) => {
  const preview = `Welcome to ${communityName} - We're Now Open!`;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  return (
    <BaseLayout preview={preview} emailType="transactional">
      <Heading style={{ ...EMAIL_STYLES.heading, textAlign: 'center' }}>
        Welcome to {communityName}! 🎉
      </Heading>

      <Text style={EMAIL_STYLES.paragraph}>
        Hi {memberName},
      </Text>

      <Text style={EMAIL_STYLES.paragraph}>
        The wait is over! <strong>{communityName}</strong> is now officially open, and you're one of
        our founding members. Your payment has been processed, and you now have full access to everything
        our community has to offer.
      </Text>

      {communityDescription && (
        <Text style={EMAIL_STYLES.paragraph}>
          {communityDescription}
        </Text>
      )}

      <Section style={{
        backgroundColor: '#f0fdf4',
        borderLeft: `4px solid ${EMAIL_COLORS.success}`,
        padding: '20px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          ✅ Payment Successful
        </Text>
        <Text style={{ fontSize: '14px', margin: '0' }}>
          Your membership payment of <strong>{formatPrice(membershipPrice)}</strong> has been successfully
          processed. Your subscription will renew monthly at this same rate.
        </Text>
      </Section>

      <Section style={{
        backgroundColor: EMAIL_COLORS.background,
        borderRadius: '8px',
        padding: '20px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          Your Membership Benefits:
        </Text>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          {benefits.map((benefit, index) => (
            <li key={index} style={{ fontSize: '14px', marginBottom: '8px', color: EMAIL_COLORS.textLight }}>
              {benefit}
            </li>
          ))}
        </ul>
      </Section>

      {nextSteps && nextSteps.length > 0 && (
        <>
          <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '18px', fontWeight: '600' }}>
            Get Started - Your Next Steps:
          </Text>

          {nextSteps.map((step, index) => (
            <Section
              key={index}
              style={{
                borderLeft: `4px solid ${EMAIL_COLORS.primary}`,
                paddingLeft: '16px',
                marginBottom: '16px',
              }}
            >
              <Text style={{ fontWeight: '600', marginBottom: '4px' }}>
                {index + 1}. {step.title}
              </Text>
              <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, margin: '0 0 8px 0' }}>
                {step.description}
              </Text>
              {step.url && (
                <a
                  href={step.url}
                  style={{
                    ...EMAIL_STYLES.link,
                    fontSize: '14px',
                  }}
                >
                  Learn more →
                </a>
              )}
            </Section>
          ))}
        </>
      )}

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={communityUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
          }}
        >
          Explore {communityName} Now
        </Button>
      </div>

      <Section style={{
        backgroundColor: '#fef3c7',
        borderLeft: `4px solid #f59e0b`,
        padding: '16px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          💡 Founding Member Bonus:
        </Text>
        <Text style={{ fontSize: '14px', margin: '4px 0' }}>
          As one of our founding members, you'll always have a special place in our community.
          Thank you for believing in us from the start!
        </Text>
      </Section>

      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: EMAIL_COLORS.textLight }}>
        Have questions? Our community managers are here to help. Just reply to this email
        or visit our help center.
      </Text>

      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', fontWeight: '600', marginTop: '24px' }}>
        Welcome aboard!<br />
        The {communityName} Team
      </Text>
    </BaseLayout>
  );
};
