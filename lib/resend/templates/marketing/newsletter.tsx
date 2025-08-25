import React from 'react';
import { Button, Heading, Text, Section, Img, Hr, Link } from '@react-email/components';
import { BaseLayout } from '../base-layout';
import { EMAIL_STYLES, EMAIL_COLORS } from '../index';

interface NewsletterSection {
  title: string;
  content: string;
  image?: string;
  buttonText?: string;
  buttonUrl?: string;
}

interface NewsletterEmailProps {
  recipientName: string;
  subject: string;
  preheader: string;
  headerImage?: string;
  introText: string;
  sections: NewsletterSection[];
  footerText?: string;
}

export const NewsletterEmail: React.FC<NewsletterEmailProps> = ({
  recipientName,
  preheader,
  headerImage,
  introText,
  sections,
  footerText,
}) => {
  return (
    <BaseLayout 
      preview={preheader}
      footer={{
        showUnsubscribe: true,
        unsubscribeUrl: `https://dance-hub.io/unsubscribe`,
        preferencesUrl: `https://dance-hub.io/preferences`,
      }}
    >
      {headerImage && (
        <Img
          src={headerImage}
          alt="Newsletter Header"
          width="560"
          height="200"
          style={{ 
            width: '100%', 
            height: 'auto',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        />
      )}
      
      <Heading style={EMAIL_STYLES.heading}>
        DanceHub Monthly Newsletter
      </Heading>
      
      <Text style={EMAIL_STYLES.paragraph}>
        Hi {recipientName},
      </Text>
      
      <Text style={EMAIL_STYLES.paragraph}>
        {introText}
      </Text>
      
      {sections.map((section, index) => (
        <Section key={index} style={{ marginBottom: '32px' }}>
          {index > 0 && (
            <Hr style={{ 
              margin: '32px 0', 
              border: 'none', 
              borderTop: `1px solid ${EMAIL_COLORS.border}` 
            }} />
          )}
          
          <Heading as="h2" style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: EMAIL_COLORS.primary,
            marginBottom: '16px' 
          }}>
            {section.title}
          </Heading>
          
          {section.image && (
            <Img
              src={section.image}
              alt={section.title}
              width="560"
              height="315"
              style={{ 
                width: '100%', 
                height: 'auto',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            />
          )}
          
          <Text style={{ 
            ...EMAIL_STYLES.paragraph,
            whiteSpace: 'pre-wrap',
          }}>
            {section.content}
          </Text>
          
          {section.buttonText && section.buttonUrl && (
            <div style={{ marginTop: '20px' }}>
              <Button
                href={section.buttonUrl}
                style={{
                  ...EMAIL_STYLES.button,
                  display: 'inline-block',
                  fontSize: '14px',
                  padding: '10px 20px',
                }}
              >
                {section.buttonText}
              </Button>
            </div>
          )}
        </Section>
      ))}
      
      {/* Featured Community Spotlight */}
      <Section style={{
        backgroundColor: EMAIL_COLORS.background,
        borderRadius: '8px',
        padding: '20px',
        margin: '32px 0',
      }}>
        <Text style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: EMAIL_COLORS.primary,
          marginBottom: '12px' 
        }}>
          🌟 Community Spotlight
        </Text>
        <Text style={{ fontSize: '14px', lineHeight: '1.6' }}>
          This month, we're celebrating our amazing dance communities who have created 
          over 100 new courses and welcomed 500+ new members! Your passion for dance 
          continues to inspire us every day.
        </Text>
      </Section>
      
      {/* Quick Links Section */}
      <Section style={{ marginTop: '32px' }}>
        <Text style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          Quick Links
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <Link 
            href="https://dance-hub.io/courses" 
            style={{ ...EMAIL_STYLES.link, fontSize: '14px' }}
          >
            Browse Courses
          </Link>
          <span style={{ color: EMAIL_COLORS.textLight }}>•</span>
          <Link 
            href="https://dance-hub.io/communities" 
            style={{ ...EMAIL_STYLES.link, fontSize: '14px' }}
          >
            Find Communities
          </Link>
          <span style={{ color: EMAIL_COLORS.textLight }}>•</span>
          <Link 
            href="https://dance-hub.io/lessons" 
            style={{ ...EMAIL_STYLES.link, fontSize: '14px' }}
          >
            Book Lessons
          </Link>
          <span style={{ color: EMAIL_COLORS.textLight }}>•</span>
          <Link 
            href="https://dance-hub.io/blog" 
            style={{ ...EMAIL_STYLES.link, fontSize: '14px' }}
          >
            Read Blog
          </Link>
        </div>
      </Section>
      
      {footerText && (
        <Text style={{ 
          ...EMAIL_STYLES.paragraph, 
          fontSize: '14px', 
          color: EMAIL_COLORS.textLight,
          marginTop: '32px' 
        }}>
          {footerText}
        </Text>
      )}
      
      {/* Social Media Links */}
      <Section style={{ 
        textAlign: 'center', 
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
      }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          Follow us for daily dance inspiration
        </Text>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link href="https://instagram.com/dancehub" style={EMAIL_STYLES.link}>
            Instagram
          </Link>
          <Link href="https://youtube.com/dancehub" style={EMAIL_STYLES.link}>
            YouTube
          </Link>
          <Link href="https://tiktok.com/@dancehub" style={EMAIL_STYLES.link}>
            TikTok
          </Link>
          <Link href="https://facebook.com/dancehub" style={EMAIL_STYLES.link}>
            Facebook
          </Link>
        </div>
      </Section>
      
      <Text style={{ 
        ...EMAIL_STYLES.paragraph, 
        fontSize: '14px', 
        fontWeight: '600', 
        marginTop: '24px',
        textAlign: 'center',
      }}>
        Keep dancing!<br />
        The DanceHub Team
      </Text>
    </BaseLayout>
  );
};