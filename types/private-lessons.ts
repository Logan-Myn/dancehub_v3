export interface PrivateLesson {
  id: string;
  community_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  regular_price: number;
  member_price?: number;
  member_discount_percentage: number;
  is_active: boolean;
  max_bookings_per_month?: number;
  requirements?: string;
  location_type: 'online' | 'in_person' | 'both';
  created_at: string;
  updated_at: string;
}

export interface LessonBooking {
  id: string;
  private_lesson_id: string;
  community_id: string;
  student_id: string;
  student_email: string;
  student_name?: string;
  is_community_member: boolean;
  price_paid: number;
  stripe_payment_intent_id?: string;
  payment_status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  lesson_status: 'booked' | 'scheduled' | 'completed' | 'canceled';
  scheduled_at?: string;
  student_message?: string;
  teacher_notes?: string;
  contact_info: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LessonBookingWithDetails extends LessonBooking {
  lesson_title: string;
  lesson_description?: string;
  duration_minutes: number;
  regular_price: number;
  member_price?: number;
  community_name: string;
  community_slug: string;
  student_full_name?: string;
  student_display_name?: string;
}

export interface CreatePrivateLessonData {
  title: string;
  description?: string;
  duration_minutes: number;
  regular_price: number;
  member_price?: number;
  max_bookings_per_month?: number;
  requirements?: string;
  location_type: 'online' | 'in_person' | 'both';
}

export interface CreateLessonBookingData {
  private_lesson_id: string;
  student_email: string;
  student_name?: string;
  student_message?: string;
  contact_info?: Record<string, any>;
}

export interface PrivateLessonCardProps {
  lesson: PrivateLesson;
  communitySlug: string;
  isMember: boolean;
  onBook: (lessonId: string) => void;
}

export interface LessonBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: PrivateLesson;
  communitySlug: string;
  isMember: boolean;
  onSuccess: () => void;
} 