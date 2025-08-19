"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { LessonBookingWithDetails } from "@/types/private-lessons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  User,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Play
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import Link from "next/link";

export default function MyBookedLessons() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<LessonBookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const supabase = createClient();
      
      console.log('🔍 Fetching bookings for student:', user!.id);
      
      const { data: bookingsData, error } = await supabase
        .from('lesson_bookings')
        .select(`
          *,
          private_lessons!inner(
            title,
            description,
            duration_minutes,
            regular_price,
            member_price,
            location_type,
            communities!inner(
              name,
              slug,
              created_by
            )
          )
        `)
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching bookings:', error);
        console.log('📊 Student booking query debug:', {
          userId: user!.id,
          errorCode: error.code,
          errorMessage: error.message,
          errorHint: error.hint
        });
        toast.error('Failed to load your bookings');
        return;
      }

      console.log('✅ Student bookings fetched:', bookingsData?.length || 0, 'bookings');
      if (bookingsData && bookingsData.length > 0) {
        console.log('📝 Sample booking:', bookingsData[0]);
      }

      const formattedBookings: LessonBookingWithDetails[] = bookingsData.map((booking: any) => ({
        ...booking,
        lesson_title: booking.private_lessons.title,
        lesson_description: booking.private_lessons.description,
        duration_minutes: booking.private_lessons.duration_minutes,
        regular_price: booking.private_lessons.regular_price,
        member_price: booking.private_lessons.member_price,
        community_name: booking.private_lessons.communities.name,
        community_slug: booking.private_lessons.communities.slug,
      }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load your bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (paymentStatus: string, lessonStatus: string) => {
    if (paymentStatus === 'succeeded') {
      switch (lessonStatus) {
        case 'scheduled':
        case 'completed':
          return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        default:
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      }
    }
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  const getStatusText = (paymentStatus: string, lessonStatus: string) => {
    if (paymentStatus !== 'succeeded') {
      return 'Payment Pending';
    }
    
    switch (lessonStatus) {
      case 'booked':
        return 'Booked';
      case 'scheduled':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'canceled':
        return 'Canceled';
      default:
        return 'Unknown';
    }
  };

  const canJoinVideo = (booking: LessonBookingWithDetails) => {
    if (booking.payment_status !== 'succeeded') return false;
    if (!booking.daily_room_name) return false;
    
    const now = new Date();
    const expiresAt = booking.daily_room_expires_at ? new Date(booking.daily_room_expires_at) : null;
    const scheduledAt = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
    
    // If lesson has expired, can't join
    if (expiresAt && now.getTime() > expiresAt.getTime()) return false;
    
    // If lesson is scheduled, only allow joining 15 minutes before start time
    if (scheduledAt) {
      const fifteenMinutesBefore = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
      return now.getTime() >= fifteenMinutesBefore.getTime();
    }
    
    // For immediate lessons (no scheduled time), can join if not expired
    return !expiresAt || now.getTime() < expiresAt.getTime();
  };

  const getJoinButtonText = (booking: LessonBookingWithDetails) => {
    if (booking.lesson_status === 'completed') {
      return 'Lesson Completed';
    }
    
    const now = new Date();
    const scheduledAt = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
    const expiresAt = booking.daily_room_expires_at ? new Date(booking.daily_room_expires_at) : null;
    
    // Check if lesson has expired
    if (expiresAt && now.getTime() > expiresAt.getTime()) {
      return 'Video Session Expired';
    }
    
    // Check if lesson hasn't started yet (more than 15 minutes before)
    if (scheduledAt) {
      const fifteenMinutesBefore = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
      if (now.getTime() < fifteenMinutesBefore.getTime()) {
        return 'Lesson Starts Soon';
      }
    }
    
    if (!canJoinVideo(booking)) {
      return 'Video Session Unavailable';
    }
    if (booking.session_started_at) {
      return 'Rejoin Lesson';
    }
    return 'Join Video Lesson';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Lessons Booked
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            You haven't booked any private lessons yet. Browse communities to find lessons!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          My Booked Lessons
        </h2>
        <Badge variant="outline">
          {bookings.length} {bookings.length === 1 ? 'lesson' : 'lessons'}
        </Badge>
      </div>

      <div className="grid gap-6">
        {bookings.map((booking) => (
          <Card key={booking.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold">
                    {booking.lesson_title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {booking.community_name}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(booking.payment_status, booking.lesson_status)}>
                  {getStatusText(booking.payment_status, booking.lesson_status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Lesson Details */}
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{booking.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>Online Video Call</span>
                </div>
                {booking.scheduled_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(booking.scheduled_at), 'PPP p')}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {booking.lesson_description && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {booking.lesson_description}
                </p>
              )}

              {/* Price */}
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Paid: €{booking.price_paid.toFixed(2)}
                </span>
                {booking.is_community_member && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    (Member Price)
                  </span>
                )}
              </div>

              {/* Student Message */}
              {booking.student_message && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Your message:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {booking.student_message}
                  </p>
                </div>
              )}

              {/* Teacher Notes */}
              {booking.teacher_notes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Teacher notes:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {booking.teacher_notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {/* Video Session Button */}
                {booking.daily_room_name && (
                  <Button
                    asChild={canJoinVideo(booking) && booking.lesson_status !== 'completed'}
                    disabled={!canJoinVideo(booking) || booking.lesson_status === 'completed'}
                    variant={booking.lesson_status === 'completed' ? 'outline' : 'default'}
                    className="flex-1"
                  >
                    {canJoinVideo(booking) && booking.lesson_status !== 'completed' ? (
                      <Link href={`/video-session/${booking.id}`} className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        {getJoinButtonText(booking)}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2">
                        {booking.lesson_status === 'completed' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {getJoinButtonText(booking)}
                      </span>
                    )}
                  </Button>
                )}

                {/* Community Link */}
                <Button variant="outline" asChild>
                  <Link 
                    href={`/${booking.community_slug}/private-lessons`}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Community
                  </Link>
                </Button>
              </div>

              {/* Video Call Status */}
              {booking.session_started_at && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
                  <p>
                    Call started: {format(new Date(booking.session_started_at), 'PPP p')}
                  </p>
                  {booking.session_ended_at && (
                    <p>
                      Call ended: {format(new Date(booking.session_ended_at), 'PPP p')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
