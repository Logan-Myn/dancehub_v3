import React from 'react';
import { Button, Heading, Text, Section, Img } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface MemberWelcomeEmailProps {
  memberName: string;
  communityName: string;
  communityDescription?: string;
  communityLogo?: string;
  communityUrl: string;
  membershipTier: 'free' | 'basic' | 'premium';
  benefits: string[];
  nextSteps?: Array<{
    title: string;
    description: string;
    url?: string;
  }>;
}

export const MemberWelcomeEmail: React.FC<MemberWelcomeEmailProps> = ({
  memberName,
  communityName,
  communityDescription,
  communityLogo,
  communityUrl,
  membershipTier,
  benefits,
  nextSteps,
}) => {
  const preview = `Welcome to ${communityName}!`;
  
  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium': return '#fbbf24';
      case 'basic': return EMAIL_COLORS.primary;
      case 'free': return EMAIL_COLORS.textLight;
      default: return EMAIL_COLORS.primary;
    }
  };
  
  return (
    <BaseLayout preview={preview}>
      {communityLogo && (
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Img
            src={communityLogo}
            alt={communityName}
            width="100"
            height="100"
            style={{ 
              borderRadius: '50%',
              border: `2px solid ${EMAIL_COLORS.border}`,
            }}
          />
        </div>
      )}
      
      <Heading style={{ ...EMAIL_STYLES.heading, textAlign: 'center' }}>
        Welcome to {communityName}! 🎉
      </Heading>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Hi {memberName},
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Congratulations! You're now officially a member of our vibrant dance community. 
        We're thrilled to have you join us on this exciting journey.
      </Text>
      
      {communityDescription && (
        <Text style={EMAIL_STYLES.paragraph}>
          {communityDescription}
        </Text>
      )}
      
      <Section style={{
        backgroundColor: EMAIL_COLORS.background,
        borderRadius: '8px',
        padding: '20px',
        margin: '24px 0',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px' 
        }}>
          <Text style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
            Your Membership
          </Text>
          <span style={{
            padding: '6px 12px',
            backgroundColor: getTierBadgeColor(membershipTier),
            color: membershipTier === 'premium' ? '#78350f' : EMAIL_COLORS.white,
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
          }}>
            {membershipTier}
          </span>
        </div>
        
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          Your benefits include:
        </Text>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          {benefits.map((benefit, index) => (
            <li key={index} style={{ fontSize: '14px', marginBottom: '4px', color: EMAIL_COLORS.textLight }}>
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
          Explore {communityName}
        </Button>
      </div>
      
      <Section style={{
        backgroundColor: '#f0fdf4',
        borderLeft: `4px solid ${EMAIL_COLORS.success}`,
        padding: '16px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          💡 Pro Tip:
        </Text>
        <Text style={{ fontSize: '14px', margin: '4px 0' }}>
          Introduce yourself in the community forum! Our members love meeting new dancers 
          and hearing about your dance journey. It's a great way to make connections and 
          find practice partners.
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