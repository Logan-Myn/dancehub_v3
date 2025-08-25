import { Resend } from 'resend';
import { EmailTemplate } from '@/lib/resend/templates';
import { 
  canSendEmail, 
  getUnsubscribeUrl, 
  getPreferencesUrl, 
  logEmailEvent,
  EmailCategory 
} from '@/lib/resend/check-preferences';

export enum EmailType {
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing'
}

export interface EmailOptions {
  from?: string;
  replyTo?: string;
  tracking?: {
    open: boolean;
    click: boolean;
  };
  tags?: Array<{ name: string; value: string }>;
}

export class EmailService {
  private resend: Resend;
  private readonly defaultFrom: string;
  private readonly defaultReplyTo: string;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'notifications@dance-hub.io';
    this.defaultReplyTo = process.env.EMAIL_REPLY_TO || 'hello@dance-hub.io';
  }

  private getEmailConfig(type: EmailType): EmailOptions {
    const baseConfig = {
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
    };

    switch (type) {
      case EmailType.TRANSACTIONAL:
        return {
          ...baseConfig,
          from: process.env.EMAIL_FROM_TRANSACTIONAL || 'account@dance-hub.io',
          tracking: {
            open: false,
            click: false,
          }
        };
      
      case EmailType.MARKETING:
        return {
          ...baseConfig,
          from: process.env.EMAIL_FROM_MARKETING || 'newsletter@dance-hub.io',
          tracking: {
            open: true,
            click: true,
          }
        };
    }
  }

  async sendWithRetry<T>(
    emailData: any,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.resend.emails.send(emailData);
        
        if (result.error) {
          throw new Error(result.error.message);
        }
        
        // Log successful email send
        console.log(`Email sent successfully: ${result.data?.id}`);
        
        return result.data as T;
      } catch (error) {
        lastError = error as Error;
        console.error(`Email send attempt ${attempt + 1} failed:`, error);
        
        // Don't retry on client errors (4xx)
        if (this.isClientError(error)) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < maxRetries - 1) {
          await this.delay(backoffMs * Math.pow(2, attempt));
        }
      }
    }
    
    throw lastError!;
  }

  private isClientError(error: any): boolean {
    // Check if error is 4xx client error
    return error?.status >= 400 && error?.status < 500;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendTransactionalEmail(
    to: string | string[],
    subject: string,
    react: React.ReactElement,
    options?: EmailOptions
  ) {
    const config = this.getEmailConfig(EmailType.TRANSACTIONAL);
    
    const emailData = {
      ...config,
      ...options,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
    };

    return await this.sendWithRetry(emailData);
  }

  async sendMarketingEmail(
    to: string | string[],
    subject: string,
    react: React.ReactElement,
    options?: EmailOptions & { category?: EmailCategory }
  ) {
    const recipients = Array.isArray(to) ? to : [to];
    const category = options?.category || 'marketing';
    
    // Filter recipients based on preferences
    const allowedRecipients: string[] = [];
    for (const recipient of recipients) {
      if (await canSendEmail(recipient, category)) {
        allowedRecipients.push(recipient);
      } else {
        console.log(`Skipping email to ${recipient} - unsubscribed from ${category}`);
      }
    }

    if (allowedRecipients.length === 0) {
      console.log('No recipients opted in for this email category');
      return;
    }

    const config = this.getEmailConfig(EmailType.MARKETING);
    
    // Add unsubscribe headers for marketing emails
    const unsubscribeUrl = await getUnsubscribeUrl(allowedRecipients[0], category);
    const preferencesUrl = await getPreferencesUrl(allowedRecipients[0]);
    
    const emailData = {
      ...config,
      ...options,
      to: allowedRecipients,
      subject,
      react,
      headers: {
        ...options?.headers,
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    const result = await this.sendWithRetry(emailData);
    
    // Log email events
    for (const recipient of allowedRecipients) {
      await logEmailEvent(recipient, 'sent', category, { subject });
    }
    
    return result;
  }

  async sendBulkEmails(
    emails: Array<{
      to: string | string[];
      subject: string;
      react: React.ReactElement;
      type?: EmailType;
      options?: EmailOptions;
    }>
  ) {
    const promises = emails.map(email => {
      if (email.type === EmailType.MARKETING) {
        return this.sendMarketingEmail(email.to, email.subject, email.react, email.options);
      } else {
        return this.sendTransactionalEmail(email.to, email.subject, email.react, email.options);
      }
    });

    return await Promise.allSettled(promises);
  }

  // Convenience methods for common email types
  async sendAuthEmail(
    to: string,
    subject: string,
    react: React.ReactElement
  ) {
    return await this.sendTransactionalEmail(to, subject, react, {
      from: 'DanceHub <account@dance-hub.io>',
    });
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    react: React.ReactElement
  ) {
    return await this.sendTransactionalEmail(to, subject, react, {
      from: 'DanceHub <notifications@dance-hub.io>',
    });
  }

  async sendNewsletterEmail(
    to: string | string[],
    subject: string,
    react: React.ReactElement,
    unsubscribeUrl: string
  ) {
    return await this.sendMarketingEmail(to, subject, react, {
      from: 'DanceHub Newsletter <newsletter@dance-hub.io>',
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  }
}

// Export singleton instance
let emailService: EmailService;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}