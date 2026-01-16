import { sql, queryOne } from "@/lib/db";
import { LessonBookingWithDetails } from "@/types/private-lessons";
import { getEmailService } from "@/lib/resend/email-service";
import { LessonReminderEmail } from "@/lib/resend/templates/video/lesson-reminder";
import React from "react";

/**
 * Video Session Notifications
 *
 * Handles sending notifications (in-app and email) for video session events
 *
 * Migrated from Supabase to Neon database
 */

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

interface CommunityCreator {
  created_by: string;
}

interface ProfileEmail {
  email: string;
}

interface ProfileName {
  display_name: string | null;
  full_name: string | null;
}

interface BookingWithLesson {
  student_id: string;
  student_name: string | null;
  teacher_id: string;
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
    const community = await queryOne<CommunityCreator>`
      SELECT created_by
      FROM communities
      WHERE id = ${booking.community_id}
    `;

    if (community?.created_by) {
      const teacherProfile = await queryOne<ProfileEmail>`
        SELECT email
        FROM profiles
        WHERE id = ${community.created_by}
      `;

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
    const community = await queryOne<CommunityCreator>`
      SELECT created_by
      FROM communities
      WHERE id = ${booking.community_id}
    `;

    if (community?.created_by) {
      const teacherProfile = await queryOne<ProfileEmail>`
        SELECT email
        FROM profiles
        WHERE id = ${community.created_by}
      `;

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
    const community = await queryOne<CommunityCreator>`
      SELECT created_by
      FROM communities
      WHERE id = ${booking.community_id}
    `;

    if (community?.created_by) {
      const teacherProfile = await queryOne<ProfileEmail>`
        SELECT email
        FROM profiles
        WHERE id = ${community.created_by}
      `;

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
    await sql`
      INSERT INTO notifications (user_id, type, title, message, data, read)
      VALUES (
        ${notification.recipientId},
        ${notification.type},
        ${getNotificationTitle(notification)},
        ${getNotificationMessage(notification)},
        ${JSON.stringify({
          booking_id: notification.bookingId,
          video_room_url: notification.videoRoomUrl,
          lesson_title: notification.lessonTitle,
          community_name: notification.communityName,
          scheduled_at: notification.scheduledAt,
        })},
        false
      )
    `;
  } catch (error) {
    console.error('Error creating in-app notification:', error);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(notification: VideoSessionNotification) {
  try {
    const emailService = getEmailService();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dancehub.com';
    const videoRoomUrl = notification.videoRoomUrl || `${baseUrl}/video-session/${notification.bookingId}`;

    // Get recipient name from profile
    const profile = await queryOne<ProfileName>`
      SELECT display_name, full_name
      FROM profiles
      WHERE id = ${notification.recipientId}
    `;

    const recipientName = profile?.display_name || profile?.full_name || 'Student';

    // Get teacher/student name based on recipient type
    const booking = await queryOne<BookingWithLesson>`
      SELECT
        lb.student_id,
        lb.student_name,
        pl.teacher_id
      FROM lesson_bookings lb
      INNER JOIN private_lessons pl ON pl.id = lb.private_lesson_id
      WHERE lb.id = ${notification.bookingId}
    `;

    let otherParticipantName = 'Participant';
    let recipientRole: 'student' | 'teacher' = 'student';

    if (booking) {
      // If recipient is the student
      if (notification.recipientId === booking.student_id) {
        recipientRole = 'student';
        // Get teacher name
        const teacher = await queryOne<ProfileName>`
          SELECT display_name, full_name
          FROM profiles
          WHERE id = ${booking.teacher_id}
        `;
        otherParticipantName = teacher?.display_name || teacher?.full_name || 'Teacher';
      } else {
        recipientRole = 'teacher';
        otherParticipantName = booking.student_name || 'Student';
      }
    }

    switch (notification.type) {
      case 'video_room_ready':
        // Skip email notification for video room ready - only create in-app notification
        console.log('Video room ready - skipping email, in-app notification created');
        break;

      case 'lesson_starting':
        await emailService.sendNotificationEmail(
          notification.recipientEmail,
          getEmailSubject(notification),
          React.createElement(LessonReminderEmail, {
            recipientName,
            recipientRole,
            otherParticipantName,
            lessonTitle: notification.lessonTitle,
            minutesUntilStart: 15,
            videoRoomUrl,
          })
        );
        break;

      case 'lesson_completed':
        // For now, send a simple text email for lesson completed
        await emailService.sendNotificationEmail(
          notification.recipientEmail,
          getEmailSubject(notification),
          React.createElement('div', {},
            React.createElement('h2', {}, 'Lesson Completed!'),
            React.createElement('p', {}, `Your lesson "${notification.lessonTitle}" has been completed.`),
            React.createElement('p', {}, 'Thank you for using DanceHub!')
          )
        );
        break;
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
      return 'Video Room Ready';
    case 'lesson_starting':
      return 'Lesson Starting Soon';
    case 'lesson_completed':
      return 'Lesson Completed';
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
