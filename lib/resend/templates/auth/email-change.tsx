import React from 'react';
import { Button, Heading, Text } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES } from '../index';

interface EmailChangeVerificationProps {
  name: string;
  currentEmail: string;
  newEmail: string;
  verificationUrl: string;
}

export const EmailChangeVerification: React.FC<EmailChangeVerificationProps> = ({
  name,
  currentEmail,
  newEmail,
  verificationUrl,
}) => {
  const preview = `Confirm your email address change`;
  
  return (
    <BaseLayout preview={preview}>
      <Heading style={EMAIL_STYLES.heading}>
        Confirm Email Address Change
      </Heading>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Hi {name},
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        You've requested to change your DanceHub account email address from:
      </Text>
      
      <div style={{ 
        backgroundColor: '#f3f4f6',
        padding: '16px',
        borderRadius: '6px',
        margin: '16px 0',
      }}>
        <Text style={{ margin: '4px 0', fontSize: '14px' }}>
          <strong>Current email:</strong> {currentEmail}
        </Text>
        <Text style={{ margin: '4px 0', fontSize: '14px' }}>
          <strong>New email:</strong> {newEmail}
        </Text>
      </div>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Please confirm this change by clicking the button below:
      </Text>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={verificationUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
          }}
        >
          Confirm Email Change
        </Button>
      </div>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: '#6b7280' }}>
        Or copy and paste this link in your browser:
      </Text>
      
      <Text style={{ 
        ...EMAIL_STYLES.paragraph, 
        fontSize: '14px', 
        color: '#6b7280',
        wordBreak: 'break-all',
        backgroundColor: '#f3f4f6',
        padding: '12px',
        borderRadius: '4px',
      }}>
        {verificationUrl}
      </Text>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: '#6b7280', marginTop: '24px' }}>
        This verification link will expire in 24 hours. If you didn't request this email change, 
        please secure your account immediately by changing your password.
      </Text>
    </BaseLayout>
  );
};