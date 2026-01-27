import React from 'react';
import { Button, Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface LessonReminderEmailProps {
  recipientName: string;
  recipientRole: 'student' | 'teacher';
  otherParticipantName: string;
  lessonTitle: string;
  minutesUntilStart: number;
  videoRoomUrl: string;
}

export const LessonReminderEmail: React.FC<LessonReminderEmailProps> = ({
  recipientName,
  recipientRole,
  otherParticipantName,
  lessonTitle,
  minutesUntilStart,
  videoRoomUrl,
}) => {
  const preview = `Your lesson starts in ${minutesUntilStart} minutes!`;
  const partnerLabel = recipientRole === 'student' ? 'teacher' : 'student';
  
  return (
    <BaseLayout preview={preview}>
      <Section style={{
        backgroundColor: EMAIL_COLORS.warning,
        color: EMAIL_COLORS.white,
        padding: '16px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '24px',
      }}>
        <Text style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          margin: 0,
          color: EMAIL_COLORS.white,
        }}>
          ⏰ Your lesson starts in {minutesUntilStart} minutes!
        </Text>
      </Section>
      
      <Heading style={EMAIL_STYLES.heading}>
        Get Ready for Your Lesson
      </Heading>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Hi {recipientName},
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Just a quick reminder that your lesson with {otherParticipantName} is starting soon!
      </Text>
      
      <Section style={{
        backgroundColor: EMAIL_COLORS.background,
        borderRadius: '8px',
        padding: '20px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: EMAIL_COLORS.primary }}>
          {lessonTitle}
        </Text>
        
        <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, margin: '4px 0' }}>
          Your {partnerLabel}: <strong>{otherParticipantName}</strong>
        </Text>
        <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, margin: '4px 0' }}>
          Starting in: <strong>{minutesUntilStart} minutes</strong>
        </Text>
      </Section>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={videoRoomUrl}
          style={{
            ...EMAIL_STYLES.button,
            backgroundColor: EMAIL_COLORS.success,
            fontSize: '18px',
            padding: '16px 32px',
            display: 'inline-block',
          }}
        >
          Join Video Session Now
        </Button>
      </div>
      
      <Text style={EMAIL_STYLES.paragraph}>
        <strong>Quick checklist:</strong>
      </Text>
      
      <ul style={{ paddingLeft: '20px', margin: '16px 0' }}>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          ✓ Camera and microphone ready
        </li>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          ✓ Good lighting and quiet space
        </li>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          ✓ Water and any materials needed
        </li>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          ✓ Other applications closed
        </li>
      </ul>
      
      {recipientRole === 'teacher' && (
        <Section style={{
          backgroundColor: '#dbeafe',
          borderLeft: `4px solid ${EMAIL_COLORS.primary}`,
          padding: '16px',
          margin: '24px 0',
        }}>
          <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Teacher reminder:
          </Text>
          <Text style={{ fontSize: '14px', margin: '4px 0' }}>
            Please join the session a few minutes early to ensure everything is set up properly for your student.
          </Text>
        </Section>
      )}
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: EMAIL_COLORS.textLight }}>
        If you're having technical difficulties, please contact support immediately at{' '}
        <a href="mailto:support@dance-hub.io" style={EMAIL_STYLES.link}>support@dance-hub.io</a>
      </Text>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', fontWeight: '600', marginTop: '24px' }}>
        Have a great lesson!<br />
        DanceHub
      </Text>
    </BaseLayout>
  );
};