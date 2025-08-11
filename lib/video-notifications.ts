import { createAdminClient } from "@/lib/supabase";
import { LessonBookingWithDetails } from "@/types/private-lessons";

const supabase = createAdminClient();

interface VideoSessionNotification {
  type: 'video_room_ready' | 'lesson_starting' | 'lesson_completed';
  bookingId: string;
  recipientId: string;
  recipientEmail: string;
  lessonTitle: string;
  communityName: string;
  videoRoomUrl?: string;
  scheduledAt?: string;
}

/**
 * Send notification when video room is ready
 */
export async function notifyVideoRoomReady(booking: LessonBookingWithDetails) {
  try {
    // Notify student
    await sendNotification({
      type: 'video_room_ready',
      bookingId: booking.id,
      recipientId: booking.student_id,
      recipientEmail: booking.student_email,
      lessonTitle: booking.lesson_title,
      communityName: booking.community_name,
      videoRoomUrl: booking.daily_room_url,
      scheduledAt: booking.scheduled_at,
    });

    // Get teacher info and notify
    const { data: community } = await supabase
      .from('communities')
      .select('created_by')
      .eq('id', booking.community_id)
      .single();

    if (community?.created_by) {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', community.created_by)
        .single();

      if (teacherProfile?.email) {
        await sendNotification({
          type: 'video_room_ready',
          bookingId: booking.id,
          recipientId: community.created_by,
          recipientEmail: teacherProfile.email,
          lessonTitle: booking.lesson_title,
          communityName: booking.community_name,
          videoRoomUrl: booking.daily_room_url,
          scheduledAt: booking.scheduled_at,
        });
      }
    }
  } catch (error) {
    console.error('Error sending video room ready notifications:', error);
  }
}

/**
 * Send notification when lesson is starting soon
 */
export async function notifyLessonStarting(booking: LessonBookingWithDetails) {
  try {
    // Notify student
    await sendNotification({
      type: 'lesson_starting',
      bookingId: booking.id,
      recipientId: booking.student_id,
      recipientEmail: booking.student_email,
      lessonTitle: booking.lesson_title,
      communityName: booking.community_name,
      videoRoomUrl: booking.daily_room_url,
      scheduledAt: booking.scheduled_at,
    });

    // Get teacher info and notify
    const { data: community } = await supabase
      .from('communities')
      .select('created_by')
      .eq('id', booking.community_id)
      .single();

    if (community?.created_by) {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', community.created_by)
        .single();

      if (teacherProfile?.email) {
        await sendNotification({
          type: 'lesson_starting',
          bookingId: booking.id,
          recipientId: community.created_by,
          recipientEmail: teacherProfile.email,
          lessonTitle: booking.lesson_title,
          communityName: booking.community_name,
          videoRoomUrl: booking.daily_room_url,
          scheduledAt: booking.scheduled_at,
        });
      }
    }
  } catch (error) {
    console.error('Error sending lesson starting notifications:', error);
  }
}

/**
 * Send notification when lesson is completed
 */
export async function notifyLessonCompleted(booking: LessonBookingWithDetails) {
  try {
    // Notify student
    await sendNotification({
      type: 'lesson_completed',
      bookingId: booking.id,
      recipientId: booking.student_id,
      recipientEmail: booking.student_email,
      lessonTitle: booking.lesson_title,
      communityName: booking.community_name,
    });

    // Get teacher info and notify
    const { data: community } = await supabase
      .from('communities')
      .select('created_by')
      .eq('id', booking.community_id)
      .single();

    if (community?.created_by) {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', community.created_by)
        .single();

      if (teacherProfile?.email) {
        await sendNotification({
          type: 'lesson_completed',
          bookingId: booking.id,
          recipientId: community.created_by,
          recipientEmail: teacherProfile.email,
          lessonTitle: booking.lesson_title,
          communityName: booking.community_name,
        });
      }
    }
  } catch (error) {
    console.error('Error sending lesson completed notifications:', error);
  }
}

/**
 * Send notification via multiple channels
 */
async function sendNotification(notification: VideoSessionNotification) {
  // Send in-app notification
  await createInAppNotification(notification);
  
  // Send email notification
  await sendEmailNotification(notification);
}

/**
 * Create in-app notification
 */
async function createInAppNotification(notification: VideoSessionNotification) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.recipientId,
        type: notification.type,
        title: getNotificationTitle(notification),
        message: getNotificationMessage(notification),
        data: {
          booking_id: notification.bookingId,
          video_room_url: notification.videoRoomUrl,
          lesson_title: notification.lessonTitle,
          community_name: notification.communityName,
          scheduled_at: notification.scheduledAt,
        },
        read: false,
      });

    if (error) {
      console.error('Error creating in-app notification:', error);
    }
  } catch (error) {
    console.error('Error creating in-app notification:', error);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(notification: VideoSessionNotification) {
  try {
    const emailData = {
      to: notification.recipientEmail,
      subject: getEmailSubject(notification),
      html: getEmailHtml(notification),
    };

    // Send via your email service (MailerSend, etc.)
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      console.error('Error sending email notification');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

/**
 * Get notification title based on type
 */
function getNotificationTitle(notification: VideoSessionNotification): string {
  switch (notification.type) {
    case 'video_room_ready':
      return '🎥 Video Room Ready';
    case 'lesson_starting':
      return '⏰ Lesson Starting Soon';
    case 'lesson_completed':
      return '✅ Lesson Completed';
    default:
      return 'Lesson Update';
  }
}

/**
 * Get notification message based on type
 */
function getNotificationMessage(notification: VideoSessionNotification): string {
  switch (notification.type) {
    case 'video_room_ready':
      return `Your video room for "${notification.lessonTitle}" is ready. You can join the lesson when it's time.`;
    case 'lesson_starting':
      return `Your lesson "${notification.lessonTitle}" is starting in 15 minutes. Click to join the video call.`;
    case 'lesson_completed':
      return `Your lesson "${notification.lessonTitle}" has been completed. Thank you for using DanceHub!`;
    default:
      return `Update for your lesson "${notification.lessonTitle}"`;
  }
}

/**
 * Get email subject based on notification type
 */
function getEmailSubject(notification: VideoSessionNotification): string {
  switch (notification.type) {
    case 'video_room_ready':
      return `Video Room Ready - ${notification.lessonTitle}`;
    case 'lesson_starting':
      return `Lesson Starting Soon - ${notification.lessonTitle}`;
    case 'lesson_completed':
      return `Lesson Completed - ${notification.lessonTitle}`;
    default:
      return `Lesson Update - ${notification.lessonTitle}`;
  }
}

/**
 * Get email HTML content based on notification type
 */
function getEmailHtml(notification: VideoSessionNotification): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dancehub.com';
  const videoSessionUrl = `${baseUrl}/video-session/${notification.bookingId}`;
  
  switch (notification.type) {
    case 'video_room_ready':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎥 Your Video Room is Ready!</h2>
          <p>Great news! Your video room for the private lesson "<strong>${notification.lessonTitle}</strong>" in ${notification.communityName} is now ready.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Lesson Details:</h3>
            <p><strong>Lesson:</strong> ${notification.lessonTitle}</p>
            <p><strong>Community:</strong> ${notification.communityName}</p>
            ${notification.scheduledAt ? `<p><strong>Scheduled:</strong> ${new Date(notification.scheduledAt).toLocaleString()}</p>` : ''}
          </div>
          
          <p>You can join the video session when it's time by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${videoSessionUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Join Video Session
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            You can join the session up to 15 minutes before the scheduled time. Make sure your camera and microphone are working properly.
          </p>
        </div>
      `;
      
    case 'lesson_starting':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⏰ Your Lesson is Starting Soon!</h2>
          <p>Your private lesson "<strong>${notification.lessonTitle}</strong>" in ${notification.communityName} is starting in 15 minutes.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc2626;">Time to Join!</h3>
            <p>Click the button below to join your video lesson now:</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${videoSessionUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Join Video Lesson Now
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Don't be late! Your teacher and video room are waiting for you.
          </p>
        </div>
      `;
      
    case 'lesson_completed':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Lesson Completed!</h2>
          <p>Your private lesson "<strong>${notification.lessonTitle}</strong>" in ${notification.communityName} has been successfully completed.</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #059669;">Thank You!</h3>
            <p>We hope you had a great learning experience. Keep practicing and improving your skills!</p>
          </div>
          
          <p>You can:</p>
          <ul>
            <li>Book another lesson with the same teacher</li>
            <li>Leave a review for the community</li>
            <li>Explore other lessons and communities</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/dashboard" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Dashboard
            </a>
          </div>
        </div>
      `;
      
    default:
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Lesson Update</h2>
          <p>There's an update for your lesson "${notification.lessonTitle}" in ${notification.communityName}.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${videoSessionUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Lesson
            </a>
          </div>
        </div>
      `;
  }
}
