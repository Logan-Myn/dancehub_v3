import { createAdminClient } from "@/lib/supabase/admin";

const supabase = createAdminClient();

export type EmailCategory = 
  | 'transactional'
  | 'marketing'
  | 'course_announcements'
  | 'lesson_reminders'
  | 'community_updates'
  | 'weekly_digest';

/**
 * Check if a user has opted in to receive a specific category of emails
 */
export async function canSendEmail(
  userEmail: string,
  category: EmailCategory
): Promise<boolean> {
  try {
    // Transactional emails are always allowed
    if (category === 'transactional') {
      return true;
    }

    // Get email preferences
    const { data: preferences, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error || !preferences) {
      // If no preferences exist, default to allowing emails
      // (preferences will be created on first login)
      console.warn(`No email preferences found for ${userEmail}, defaulting to allow`);
      return true;
    }

    // Check if user has unsubscribed from all
    if (preferences.unsubscribed_all) {
      return false;
    }

    // Check specific category preference
    switch (category) {
      case 'marketing':
        return preferences.marketing_emails ?? true;
      case 'course_announcements':
        return preferences.course_announcements ?? true;
      case 'lesson_reminders':
        return preferences.lesson_reminders ?? true;
      case 'community_updates':
        return preferences.community_updates ?? true;
      case 'weekly_digest':
        return preferences.weekly_digest ?? false;
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking email preferences:', error);
    // Default to sending if there's an error
    return true;
  }
}

/**
 * Get unsubscribe URL for a user
 */
export async function getUnsubscribeUrl(
  userEmail: string,
  emailType?: EmailCategory
): Promise<string> {
  try {
    const { data: preferences } = await supabase
      .from('email_preferences')
      .select('unsubscribe_token')
      .eq('email', userEmail)
      .single();

    if (preferences?.unsubscribe_token) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dance-hub.io';
      const url = new URL('/api/email/unsubscribe', baseUrl);
      url.searchParams.set('token', preferences.unsubscribe_token);
      if (emailType && emailType !== 'transactional') {
        url.searchParams.set('type', emailType);
      }
      return url.toString();
    }
  } catch (error) {
    console.error('Error getting unsubscribe URL:', error);
  }

  // Fallback URL
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dance-hub.io'}/settings/email-preferences`;
}

/**
 * Get preferences URL for a user
 */
export async function getPreferencesUrl(userEmail: string): Promise<string> {
  try {
    const { data: preferences } = await supabase
      .from('email_preferences')
      .select('unsubscribe_token')
      .eq('email', userEmail)
      .single();

    if (preferences?.unsubscribe_token) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dance-hub.io';
      return `${baseUrl}/settings/email-preferences?token=${preferences.unsubscribe_token}`;
    }
  } catch (error) {
    console.error('Error getting preferences URL:', error);
  }

  // Fallback URL
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dance-hub.io'}/settings/email-preferences`;
}

/**
 * Log email event for tracking
 */
export async function logEmailEvent(
  userEmail: string,
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed',
  emailType: EmailCategory,
  metadata?: any
): Promise<void> {
  try {
    // Get user ID from email
    const { data: userData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    await supabase
      .from('email_events')
      .insert({
        user_id: userData?.id,
        email: userEmail,
        event_type: eventType,
        email_type: emailType,
        metadata,
      });
  } catch (error) {
    console.error('Error logging email event:', error);
  }
}