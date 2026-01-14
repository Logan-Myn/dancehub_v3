-- DanceHub Supabase RLS Policies Backup
-- Backup Date: January 2025
-- Project ID: rmnndxnjzacfhrbixxfo

-- =====================================================
-- ADMIN ACCESS LOG POLICIES
-- =====================================================

-- Only admins can insert into access log
CREATE POLICY "Only admins can insert into access log" ON public.admin_access_log
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Only admins can view access log
CREATE POLICY "Only admins can view access log" ON public.admin_access_log
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- =====================================================
-- CHAPTERS POLICIES
-- =====================================================

-- Chapters are viewable by everyone
CREATE POLICY "Chapters are viewable by everyone" ON public.chapters
FOR SELECT TO public
USING (true);

-- Chapters can be created by authenticated users
CREATE POLICY "Chapters can be created by authenticated users" ON public.chapters
FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- Chapters can be updated by authenticated users
CREATE POLICY "Chapters can be updated by authenticated users" ON public.chapters
FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

-- Course creators can delete chapters
CREATE POLICY "Course creators can delete chapters" ON public.chapters
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN communities com ON c.community_id = com.id
    WHERE c.id = chapters.course_id AND com.created_by = auth.uid()
  )
);

-- Course creators can insert chapters
CREATE POLICY "Course creators can insert chapters" ON public.chapters
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN communities com ON c.community_id = com.id
    WHERE c.id = chapters.course_id AND com.created_by = auth.uid()
  )
);

-- Course creators can update chapters
CREATE POLICY "Course creators can update chapters" ON public.chapters
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN communities com ON c.community_id = com.id
    WHERE c.id = chapters.course_id AND com.created_by = auth.uid()
  )
);

-- Users can view chapters
CREATE POLICY "Users can view chapters" ON public.chapters
FOR SELECT TO public
USING (true);

-- =====================================================
-- COMMENTS POLICIES
-- =====================================================

-- Anyone can read comments
CREATE POLICY "Anyone can read comments" ON public.comments
FOR SELECT TO public
USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (true);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- COMMUNITIES POLICIES
-- =====================================================

-- Communities are viewable by everyone
CREATE POLICY "Communities are viewable by everyone" ON public.communities
FOR SELECT TO public
USING (true);

-- Communities can be created by authenticated users
CREATE POLICY "Communities can be created by authenticated users" ON public.communities
FOR INSERT TO public
WITH CHECK (auth.uid() = created_by);

-- Communities can be updated by their creators
CREATE POLICY "Communities can be updated by their creators" ON public.communities
FOR UPDATE TO public
USING (auth.uid() = created_by);

-- =====================================================
-- COMMUNITY MEMBERS POLICIES
-- =====================================================

-- Admins can manage community members
CREATE POLICY "Admins can manage community members" ON public.community_members
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Community members are viewable by everyone
CREATE POLICY "Community members are viewable by everyone" ON public.community_members
FOR SELECT TO public
USING (true);

-- Users can leave communities
CREATE POLICY "Users can leave communities" ON public.community_members
FOR DELETE TO public
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT communities.created_by FROM communities
    WHERE communities.id = community_members.community_id
  )
);

-- =====================================================
-- COURSES POLICIES
-- =====================================================

-- Courses are viewable by everyone
CREATE POLICY "Courses are viewable by everyone" ON public.courses
FOR SELECT TO public
USING (true);

-- Users can create courses if they are community creators
CREATE POLICY "Users can create courses if they are community creators" ON public.courses
FOR INSERT TO public
WITH CHECK (
  auth.uid() IN (
    SELECT communities.created_by FROM communities
    WHERE communities.id = courses.community_id
  )
);

-- Users can delete their own courses
CREATE POLICY "Users can delete their own courses" ON public.courses
FOR DELETE TO public
USING (auth.uid() = created_by);

-- Users can update their own courses
CREATE POLICY "Users can update their own courses" ON public.courses
FOR UPDATE TO public
USING (auth.uid() = created_by);

-- =====================================================
-- EMAIL CHANGE REQUESTS POLICIES
-- =====================================================

-- Only authenticated users can create email change requests
CREATE POLICY "Only authenticated users can create email change requests" ON public.email_change_requests
FOR INSERT TO public
WITH CHECK (auth.role() = 'authenticated');

-- Only service role can delete email change requests
CREATE POLICY "Only service role can delete email change requests" ON public.email_change_requests
FOR DELETE TO public
USING ((auth.jwt() ->> 'role') = 'service_role');

-- Users can view their own email change requests
CREATE POLICY "Users can view their own email change requests" ON public.email_change_requests
FOR SELECT TO public
USING (auth.uid() = user_id);

-- =====================================================
-- FEE CHANGES POLICIES
-- =====================================================

-- Admins can manage fee changes
CREATE POLICY "Admins can manage fee changes" ON public.fee_changes
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Community admins can view their community fee changes
CREATE POLICY "Community admins can view their community fee changes" ON public.fee_changes
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = fee_changes.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role = 'admin'
  )
);

-- Service role can manage fee changes
CREATE POLICY "Service role can manage fee changes" ON public.fee_changes
FOR ALL TO public
USING (auth.role() = 'service_role');

-- =====================================================
-- LESSON BOOKINGS POLICIES
-- =====================================================

-- Students can create bookings
CREATE POLICY "Students can create bookings" ON public.lesson_bookings
FOR INSERT TO public
WITH CHECK (student_id = auth.uid());

-- Students can view their own bookings
CREATE POLICY "Students can view their own bookings" ON public.lesson_bookings
FOR SELECT TO public
USING (student_id = auth.uid());

-- Teachers can update their lesson bookings
CREATE POLICY "Teachers can update their lesson bookings" ON public.lesson_bookings
FOR UPDATE TO public
USING (
  community_id IN (
    SELECT communities.id FROM communities
    WHERE communities.created_by = auth.uid()
  )
);

-- Teachers can view bookings for their lessons
CREATE POLICY "Teachers can view bookings for their lessons" ON public.lesson_bookings
FOR SELECT TO public
USING (
  community_id IN (
    SELECT communities.id FROM communities
    WHERE communities.created_by = auth.uid()
  )
);

-- =====================================================
-- LESSON COMPLETIONS POLICIES
-- =====================================================

-- Users can delete their own lesson completions
CREATE POLICY "Users can delete their own lesson completions" ON public.lesson_completions
FOR DELETE TO public
USING (auth.uid() = user_id);

-- Users can insert their own lesson completions
CREATE POLICY "Users can insert their own lesson completions" ON public.lesson_completions
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Users can view their own lesson completions
CREATE POLICY "Users can view their own lesson completions" ON public.lesson_completions
FOR SELECT TO public
USING (auth.uid() = user_id);

-- =====================================================
-- LESSONS POLICIES
-- =====================================================

-- Course creators can delete lessons
CREATE POLICY "Course creators can delete lessons" ON public.lessons
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM chapters ch
    JOIN courses c ON ch.course_id = c.id
    JOIN communities com ON c.community_id = com.id
    WHERE ch.id = lessons.chapter_id AND com.created_by = auth.uid()
  )
);

-- Course creators can insert lessons
CREATE POLICY "Course creators can insert lessons" ON public.lessons
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chapters ch
    JOIN courses c ON ch.course_id = c.id
    JOIN communities com ON c.community_id = com.id
    WHERE ch.id = lessons.chapter_id AND com.created_by = auth.uid()
  )
);

-- Course creators can update lessons
CREATE POLICY "Course creators can update lessons" ON public.lessons
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM chapters ch
    JOIN courses c ON ch.course_id = c.id
    JOIN communities com ON c.community_id = com.id
    WHERE ch.id = lessons.chapter_id AND com.created_by = auth.uid()
  )
);

-- Lessons are viewable by everyone
CREATE POLICY "Lessons are viewable by everyone" ON public.lessons
FOR SELECT TO public
USING (true);

-- Lessons can be created by authenticated users
CREATE POLICY "Lessons can be created by authenticated users" ON public.lessons
FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- Lessons can be updated by authenticated users
CREATE POLICY "Lessons can be updated by authenticated users" ON public.lessons
FOR UPDATE TO public
USING (auth.uid() IS NOT NULL);

-- Users can view lessons
CREATE POLICY "Users can view lessons" ON public.lessons
FOR SELECT TO public
USING (true);

-- =====================================================
-- LIVE CLASS PARTICIPANTS POLICIES
-- =====================================================

-- Community creators can view participants
CREATE POLICY "Community creators can view participants" ON public.live_class_participants
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM live_classes lc
    JOIN communities c ON lc.community_id = c.id
    WHERE lc.id = live_class_participants.live_class_id AND c.created_by = auth.uid()
  )
);

-- Students can manage their participation
CREATE POLICY "Students can manage their participation" ON public.live_class_participants
FOR ALL TO public
USING (auth.uid() = student_id);

-- Teachers can view participants
CREATE POLICY "Teachers can view participants" ON public.live_class_participants
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM live_classes lc
    WHERE lc.id = live_class_participants.live_class_id AND lc.teacher_id = auth.uid()
  )
);

-- =====================================================
-- LIVE CLASSES POLICIES
-- =====================================================

-- Community members can view live classes
CREATE POLICY "Community members can view live classes" ON public.live_classes
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = live_classes.community_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = live_classes.community_id AND c.created_by = auth.uid()
  )
);

-- Teachers can manage their live classes
CREATE POLICY "Teachers can manage their live classes" ON public.live_classes
FOR ALL TO public
USING (
  auth.uid() = teacher_id OR
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = live_classes.community_id AND communities.created_by = auth.uid()
  )
);

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Service role can create notifications
CREATE POLICY "Service role can create notifications" ON public.notifications
FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE TO public
USING (auth.uid() = user_id);

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT TO public
USING (auth.uid() = user_id);

-- =====================================================
-- PASSWORD RESET REQUESTS POLICIES
-- =====================================================

-- Only service role can access password reset requests
CREATE POLICY "Only service role can access password reset requests" ON public.password_reset_requests
FOR ALL TO public
USING ((auth.jwt() ->> 'role') = 'service_role');

-- =====================================================
-- PRIVATE LESSONS POLICIES
-- =====================================================

-- Anyone can view active private lessons
CREATE POLICY "Anyone can view active private lessons" ON public.private_lessons
FOR SELECT TO public
USING (is_active = true);

-- Community creators can manage their private lessons
CREATE POLICY "Community creators can manage their private lessons" ON public.private_lessons
FOR ALL TO public
USING (
  community_id IN (
    SELECT communities.id FROM communities
    WHERE communities.created_by = auth.uid()
  )
);

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Admins can manage user profiles
CREATE POLICY "Admins can manage user profiles" ON public.profiles
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.is_admin = true
  )
);

-- Public profiles are viewable by everyone
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT TO public
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO public
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO public
USING (auth.uid() = id);

-- =====================================================
-- SIGNUP VERIFICATIONS POLICIES
-- =====================================================

-- Only service role can access signup verifications
CREATE POLICY "Only service role can access signup verifications" ON public.signup_verifications
FOR ALL TO public
USING ((auth.jwt() ->> 'role') = 'service_role');

-- =====================================================
-- STRIPE ONBOARDING PROGRESS POLICIES
-- =====================================================

-- Users can update their community onboarding progress
CREATE POLICY "Users can update their community onboarding progress" ON public.stripe_onboarding_progress
FOR ALL TO public
USING (
  community_id IN (
    SELECT communities.id FROM communities
    WHERE communities.created_by = auth.uid()
  )
);

-- Users can view their community onboarding progress
CREATE POLICY "Users can view their community onboarding progress" ON public.stripe_onboarding_progress
FOR SELECT TO public
USING (
  community_id IN (
    SELECT communities.id FROM communities
    WHERE communities.created_by = auth.uid()
  )
);

-- =====================================================
-- SUBSCRIPTIONS POLICIES
-- =====================================================

-- Subscriptions are viewable by the user who owns them
CREATE POLICY "Subscriptions are viewable by the user who owns them" ON public.subscriptions
FOR SELECT TO public
USING (auth.uid() = user_id);

-- Subscriptions can be created by authenticated users
CREATE POLICY "Subscriptions can be created by authenticated users" ON public.subscriptions
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Subscriptions can be updated by the user who owns them
CREATE POLICY "Subscriptions can be updated by the user who owns them" ON public.subscriptions
FOR UPDATE TO public
USING (auth.uid() = user_id);

-- =====================================================
-- TEACHER AVAILABILITY SLOTS POLICIES
-- =====================================================

-- Community members can view availability for booking
CREATE POLICY "Community members can view availability for booking" ON public.teacher_availability_slots
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = teacher_availability_slots.community_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  )
);

-- Teachers can delete own availability
CREATE POLICY "Teachers can delete own availability" ON public.teacher_availability_slots
FOR DELETE TO public
USING (auth.uid() = teacher_id);

-- Teachers can insert own availability
CREATE POLICY "Teachers can insert own availability" ON public.teacher_availability_slots
FOR INSERT TO public
WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update own availability
CREATE POLICY "Teachers can update own availability" ON public.teacher_availability_slots
FOR UPDATE TO public
USING (auth.uid() = teacher_id);

-- Teachers can view own availability
CREATE POLICY "Teachers can view own availability" ON public.teacher_availability_slots
FOR SELECT TO public
USING (auth.uid() = teacher_id);

-- =====================================================
-- THREADS POLICIES
-- =====================================================

-- Authenticated users can create threads
CREATE POLICY "Authenticated users can create threads" ON public.threads
FOR INSERT TO public
WITH CHECK (
  auth.uid() = user_id AND
  category_id IS NOT NULL AND
  category_name IS NOT NULL
);

-- Only community creator can pin threads
CREATE POLICY "Only community creator can pin threads" ON public.threads
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = threads.community_id AND communities.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = threads.community_id AND communities.created_by = auth.uid()
  )
);

-- Threads are viewable by everyone
CREATE POLICY "Threads are viewable by everyone" ON public.threads
FOR SELECT TO public
USING (true);

-- Users can update their own threads
CREATE POLICY "Users can update their own threads" ON public.threads
FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  category_id IS NOT NULL AND
  category_name IS NOT NULL
);
