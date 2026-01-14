-- DanceHub Supabase Views Backup
-- Backup Date: January 2025
-- Project ID: rmnndxnjzacfhrbixxfo

-- =====================================================
-- VIEW: community_members_with_profiles
-- Purpose: Join community members with their profile data
-- =====================================================

CREATE OR REPLACE VIEW public.community_members_with_profiles AS
SELECT
    cm.id,
    cm.user_id,
    cm.community_id,
    cm.role,
    cm.created_at,
    cm.joined_at,
    cm.status,
    cm.payment_intent_id,
    cm.subscription_id,
    cm.subscription_status,
    cm.current_period_end,
    cm.stripe_customer_id,
    cm.stripe_subscription_id,
    cm.last_payment_date,
    cm.platform_fee_percentage,
    p.full_name,
    p.avatar_url,
    p.display_name,
    COALESCE(
        p.display_name,
        CASE
            WHEN p.full_name IS NOT NULL THEN format_display_name(p.full_name)
            ELSE 'Anonymous'::text
        END
    ) AS formatted_display_name
FROM community_members cm
LEFT JOIN profiles p ON cm.user_id = p.id;

-- =====================================================
-- VIEW: lesson_bookings_with_details
-- Purpose: Join lesson bookings with lesson, community, and student details
-- =====================================================

CREATE OR REPLACE VIEW public.lesson_bookings_with_details AS
SELECT
    lb.id,
    lb.private_lesson_id,
    lb.community_id,
    lb.student_id,
    lb.student_email,
    lb.student_name,
    lb.is_community_member,
    lb.price_paid,
    lb.stripe_payment_intent_id,
    lb.payment_status,
    lb.lesson_status,
    lb.scheduled_at,
    lb.student_message,
    lb.teacher_notes,
    lb.contact_info,
    lb.created_at,
    lb.updated_at,
    pl.title AS lesson_title,
    pl.description AS lesson_description,
    pl.duration_minutes,
    pl.regular_price,
    pl.member_price,
    c.name AS community_name,
    c.slug AS community_slug,
    p.full_name AS student_full_name,
    p.display_name AS student_display_name
FROM lesson_bookings lb
JOIN private_lessons pl ON lb.private_lesson_id = pl.id
JOIN communities c ON lb.community_id = c.id
LEFT JOIN profiles p ON lb.student_id = p.id;

-- =====================================================
-- VIEW: live_classes_with_details
-- Purpose: Join live classes with teacher and community details
--          Includes computed fields for active status
-- =====================================================

CREATE OR REPLACE VIEW public.live_classes_with_details AS
SELECT
    lc.id,
    lc.community_id,
    lc.teacher_id,
    lc.title,
    lc.description,
    lc.scheduled_start_time,
    lc.duration_minutes,
    lc.daily_room_name,
    lc.daily_room_url,
    lc.daily_room_token_teacher,
    lc.daily_room_expires_at,
    lc.status,
    lc.created_at,
    lc.updated_at,
    p.display_name AS teacher_name,
    p.avatar_url AS teacher_avatar_url,
    c.name AS community_name,
    c.slug AS community_slug,
    c.created_by AS community_created_by,
    -- Computed: Is the class currently happening?
    CASE
        WHEN (
            now() >= lc.scheduled_start_time
            AND now() <= (lc.scheduled_start_time + (interval '1 minute' * lc.duration_minutes))
        ) THEN true
        ELSE false
    END AS is_currently_active,
    -- Computed: Is the class starting within 15 minutes?
    CASE
        WHEN (
            lc.scheduled_start_time <= (now() + interval '15 minutes')
            AND lc.scheduled_start_time > now()
        ) THEN true
        ELSE false
    END AS is_starting_soon
FROM live_classes lc
JOIN profiles p ON lc.teacher_id = p.id
JOIN communities c ON lc.community_id = c.id;
