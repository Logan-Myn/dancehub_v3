import React from 'react';
import { Button, Heading, Text } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES } from '../index';

interface PasswordResetEmailProps {
  name: string;
  email: string;
  resetUrl: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  name,
  email,
  resetUrl,
}) => {
  const preview = `Reset your DanceHub password`;
  
  return (
    <BaseLayout preview={preview}>
      <Heading style={EMAIL_STYLES.heading}>
        Reset Your Password
      </Heading>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Hi {name},
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        We received a request to reset the password for your DanceHub account associated with {email}.
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Click the button below to reset your password:
      </Text>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={resetUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
          }}
        >
          Reset Password
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
        {resetUrl}
      </Text>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: '#6b7280', marginTop: '24px' }}>
        <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
      </Text>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: '#6b7280' }}>
        If you didn't request this password reset, you can safely ignore this email. 
        Your password won't be changed until you create a new one.
      </Text>
    </BaseLayout>
  );
};