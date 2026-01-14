-- DanceHub Supabase Triggers Backup
-- Backup Date: January 2025
-- Project ID: rmnndxnjzacfhrbixxfo

-- =====================================================
-- CHAPTERS TRIGGERS
-- =====================================================

CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS TRIGGERS
-- =====================================================

CREATE TRIGGER update_thread_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION update_thread_comments_count();

-- =====================================================
-- COMMUNITIES TRIGGERS
-- =====================================================

CREATE TRIGGER update_communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMUNITY MEMBERS TRIGGERS
-- =====================================================

CREATE TRIGGER update_community_member_counts_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_counts();

CREATE TRIGGER update_members_count_trigger
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_members_count();

-- =====================================================
-- LESSON BOOKINGS TRIGGERS
-- =====================================================

CREATE TRIGGER update_lesson_bookings_updated_at
BEFORE UPDATE ON public.lesson_bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LESSONS TRIGGERS
-- =====================================================

CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LIVE CLASSES TRIGGERS
-- =====================================================

CREATE TRIGGER update_live_classes_updated_at
BEFORE UPDATE ON public.live_classes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRIVATE LESSONS TRIGGERS
-- =====================================================

CREATE TRIGGER update_private_lessons_updated_at
BEFORE UPDATE ON public.private_lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STRIPE ONBOARDING PROGRESS TRIGGERS
-- =====================================================

CREATE TRIGGER update_stripe_onboarding_progress_updated_at
BEFORE UPDATE ON public.stripe_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TEACHER AVAILABILITY SLOTS TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_update_teacher_availability_slots_updated_at
BEFORE UPDATE ON public.teacher_availability_slots
FOR EACH ROW
EXECUTE FUNCTION update_teacher_availability_slots_updated_at();

-- =====================================================
-- THREADS TRIGGERS
-- =====================================================

CREATE TRIGGER update_threads_updated_at
BEFORE UPDATE ON public.threads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTH SCHEMA TRIGGERS (on auth.users)
-- =====================================================

-- This trigger creates a profile when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
