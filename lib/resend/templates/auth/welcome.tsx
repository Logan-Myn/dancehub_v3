import React from 'react';
import { Button, Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  name,
  dashboardUrl,
}) => {
  const preview = `Welcome to DanceHub - Let's get started!`;
  
  return (
    <BaseLayout preview={preview}>
      <Heading style={EMAIL_STYLES.heading}>
        Welcome to DanceHub, {name}! 🎉
      </Heading>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Your email has been verified and your account is now active. We're thrilled to have you as part of our dance community!
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Here's what you can do next to get the most out of DanceHub:
      </Text>
      
      <Section style={{ margin: '24px 0' }}>
        <div style={{ 
          borderLeft: `4px solid ${EMAIL_COLORS.primary}`,
          paddingLeft: '16px',
          marginBottom: '16px'
        }}>
          <Text style={{ fontWeight: '600', marginBottom: '4px' }}>
            🏫 Join a Community
          </Text>
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, margin: 0 }}>
            Browse and join dance communities that match your interests and skill level.
          </Text>
        </div>
        
        <div style={{ 
          borderLeft: `4px solid ${EMAIL_COLORS.primary}`,
          paddingLeft: '16px',
          marginBottom: '16px'
        }}>
          <Text style={{ fontWeight: '600', marginBottom: '4px' }}>
            📚 Explore Courses
          </Text>
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, margin: 0 }}>
            Discover structured courses to improve your dance skills at your own pace.
          </Text>
        </div>
        
        <div style={{ 
          borderLeft: `4px solid ${EMAIL_COLORS.primary}`,
          paddingLeft: '16px',
          marginBottom: '16px'
        }}>
          <Text style={{ fontWeight: '600', marginBottom: '4px' }}>
            👨‍🏫 Book Private Lessons
          </Text>
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, margin: 0 }}>
            Get personalized instruction with one-on-one video lessons from expert teachers.
          </Text>
        </div>
        
        <div style={{ 
          borderLeft: `4px solid ${EMAIL_COLORS.primary}`,
          paddingLeft: '16px',
        }}>
          <Text style={{ fontWeight: '600', marginBottom: '4px' }}>
            👤 Complete Your Profile
          </Text>
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, margin: 0 }}>
            Add your dance interests and goals to get personalized recommendations.
          </Text>
        </div>
      </Section>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={dashboardUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
          }}
        >
          Go to Dashboard
        </Button>
      </div>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: '#6b7280' }}>
        Need help getting started? Check out our{' '}
        <a href="https://dance-hub.io/help" style={EMAIL_STYLES.link}>
          help center
        </a>{' '}
        or reply to this email - we're here to help!
      </Text>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', fontWeight: '600', marginTop: '24px' }}>
        Happy dancing!<br />
        The DanceHub Team
      </Text>
    </BaseLayout>
  );
};