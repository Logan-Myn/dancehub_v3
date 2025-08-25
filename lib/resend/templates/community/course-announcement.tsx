import React from 'react';
import { Button, Heading, Text, Section, Img } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface CourseAnnouncementEmailProps {
  recipientName: string;
  courseTitle: string;
  courseDescription: string;
  instructorName: string;
  courseThumbnail?: string;
  courseUrl: string;
  communityName: string;
  courseDuration?: string;
  courseLevel?: 'beginner' | 'intermediate' | 'advanced';
  price?: number;
}

export const CourseAnnouncementEmail: React.FC<CourseAnnouncementEmailProps> = ({
  recipientName,
  courseTitle,
  courseDescription,
  instructorName,
  courseThumbnail,
  courseUrl,
  communityName,
  courseDuration,
  courseLevel,
  price,
}) => {
  const preview = `New course available: ${courseTitle}`;
  
  const getLevelBadgeColor = (level?: string) => {
    switch (level) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return EMAIL_COLORS.primary;
    }
  };
  
  return (
    <BaseLayout 
      preview={preview}
      footer={{
        showUnsubscribe: true,
        unsubscribeUrl: `https://dance-hub.io/unsubscribe`,
        preferencesUrl: `https://dance-hub.io/preferences`,
      }}
    >
      <Heading style={EMAIL_STYLES.heading}>
        New Course Available! 🎯
      </Heading>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Hi {recipientName},
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Exciting news! A new course has just been published in the <strong>{communityName}</strong> community that we think you'll love.
      </Text>
      
      {courseThumbnail && (
        <Img
          src={courseThumbnail}
          alt={courseTitle}
          width="560"
          height="315"
          style={{ 
            width: '100%', 
            height: 'auto',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        />
      )}
      
      <Section style={{
        backgroundColor: EMAIL_COLORS.background,
        borderRadius: '8px',
        padding: '20px',
        margin: '24px 0',
      }}>
        <Text style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '12px', 
          color: EMAIL_COLORS.primary 
        }}>
          {courseTitle}
        </Text>
        
        <div style={{ marginBottom: '16px' }}>
          {courseLevel && (
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: getLevelBadgeColor(courseLevel),
              color: EMAIL_COLORS.white,
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginRight: '8px',
            }}>
              {courseLevel}
            </span>
          )}
          {courseDuration && (
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: EMAIL_COLORS.border,
              color: EMAIL_COLORS.text,
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
            }}>
              {courseDuration}
            </span>
          )}
        </div>
        
        <Text style={{ fontSize: '14px', color: EMAIL_COLORS.textLight, marginBottom: '12px' }}>
          <strong>Instructor:</strong> {instructorName}
        </Text>
        
        <Text style={{ fontSize: '14px', lineHeight: '1.6', color: EMAIL_COLORS.text, marginBottom: '16px' }}>
          {courseDescription}
        </Text>
        
        {price !== undefined && (
          <Text style={{ fontSize: '18px', fontWeight: '600', color: EMAIL_COLORS.primary, marginTop: '16px' }}>
            {price === 0 ? 'FREE' : `$${(price / 100).toFixed(2)}`}
          </Text>
        )}
      </Section>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={courseUrl}
          style={{
            ...EMAIL_STYLES.button,
            display: 'inline-block',
          }}
        >
          View Course Details
        </Button>
      </div>
      
      <Section style={{
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        padding: '16px',
        margin: '24px 0',
      }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          What you'll learn:
        </Text>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li style={{ fontSize: '14px', marginBottom: '4px' }}>
            Professional techniques from experienced instructors
          </li>
          <li style={{ fontSize: '14px', marginBottom: '4px' }}>
            Step-by-step progression at your own pace
          </li>
          <li style={{ fontSize: '14px', marginBottom: '4px' }}>
            Access to exclusive community resources
          </li>
        </ul>
      </Section>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', color: EMAIL_COLORS.textLight }}>
        Don't miss out on this opportunity to enhance your dance skills. Spaces may be limited!
      </Text>
      
      <Text style={{ ...EMAIL_STYLES.paragraph, fontSize: '14px', fontWeight: '600', marginTop: '24px' }}>
        Happy learning!<br />
        The {communityName} Team
      </Text>
    </BaseLayout>
  );
};