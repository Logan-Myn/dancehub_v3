import { createAdminClient } from "@/lib/supabase";
import { LessonBookingWithDetails } from "@/types/private-lessons";
import { getEmailService } from "@/lib/resend/email-service";
import { LessonReminderEmail } from "@/lib/resend/templates/video/lesson-reminder";
import React from "react";

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
    const emailService = getEmailService();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dancehub.com';
    const videoRoomUrl = notification.videoRoomUrl || `${baseUrl}/video-session/${notification.bookingId}`;
    
    // Get recipient name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', notification.recipientId)
      .single();
    
    const recipientName = profile?.display_name || profile?.full_name || 'Student';
    
    // Get teacher/student name based on recipient type
    const { data: booking } = await supabase
      .from('lesson_bookings')
      .select('student_id, student_name, lesson:private_lessons!inner(teacher_id)')
      .eq('id', notification.bookingId)
      .single();
    
    let otherParticipantName = 'Participant';
    let recipientRole: 'student' | 'teacher' = 'student';
    
    if (booking) {
      // If recipient is the student
      if (notification.recipientId === booking.student_id) {
        recipientRole = 'student';
        // Get teacher name
        const teacherInfo = Array.isArray(booking.lesson) ? booking.lesson[0] : booking.lesson;
        const { data: teacher } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', teacherInfo?.teacher_id)
          .single();
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
        // You could create a dedicated template for this
        await emailService.sendNotificationEmail(
          notification.recipientEmail,
          getEmailSubject(notification),
          React.createElement('div', {},
            React.createElement('h2', {}, '✅ Lesson Completed!'),
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

