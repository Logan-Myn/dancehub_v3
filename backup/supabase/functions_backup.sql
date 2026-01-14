-- DanceHub Supabase Functions Backup
-- Backup Date: January 2025
-- Project ID: rmnndxnjzacfhrbixxfo

-- =====================================================
-- PLATFORM FEE CALCULATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_platform_fee_percentage(member_count integer)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
BEGIN
  IF member_count <= 50 THEN
    RETURN 8.0;
  ELSIF member_count <= 100 THEN
    RETURN 6.0;
  ELSE
    RETURN 4.0;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_platform_fee_percentage_with_promo(
  member_count integer,
  is_promotional boolean DEFAULT false,
  promotional_fee numeric DEFAULT 0.0
)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If it's during promotional period, return promotional fee
  IF is_promotional THEN
    RETURN promotional_fee;
  END IF;

  -- Otherwise use standard tiered pricing
  IF member_count <= 50 THEN
    RETURN 8.0;
  ELSIF member_count <= 100 THEN
    RETURN 6.0;
  ELSE
    RETURN 4.0;
  END IF;
END;
$function$;

-- =====================================================
-- MEMBER COUNT MANAGEMENT
-- =====================================================

CREATE OR REPLACE FUNCTION public.decrement_members_count(community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE communities
    SET members_count = GREATEST(members_count - 1, 0)
    WHERE id = community_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_members_count(community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE communities
    SET members_count = members_count + 1
    WHERE id = community_id;
END;
$function$;

-- =====================================================
-- COMMUNITY MANAGEMENT
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_community(p_community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  -- Delete lessons first
  delete from lessons
  where chapter_id in (
    select ch.id
    from chapters ch
    join courses c on ch.course_id = c.id
    where c.community_id = p_community_id
  );

  -- Delete chapters
  delete from chapters
  where course_id in (
    select id from courses
    where community_id = p_community_id
  );

  -- Delete courses
  delete from courses
  where community_id = p_community_id;

  -- Delete community members
  delete from community_members
  where community_id = p_community_id;

  -- Delete the community (fee_changes will be deleted automatically via ON DELETE CASCADE)
  delete from communities
  where id = p_community_id;
end;
$function$;

-- =====================================================
-- DISPLAY NAME HELPERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.format_display_name(full_name text)
RETURNS text
LANGUAGE plpgsql
AS $function$
BEGIN
    IF full_name IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN SPLIT_PART(full_name, ' ', 1) || ' ' ||
           LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_display_name(p_display_name text, p_full_name text)
RETURNS text
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Return display_name if set, otherwise return formatted full_name
    RETURN COALESCE(p_display_name,
        CASE
            WHEN p_full_name IS NOT NULL THEN
                format_display_name(p_full_name)
            ELSE
                NULL
        END
    );
END;
$function$;

-- =====================================================
-- COURSE AND LESSON FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_course_with_ordered_lessons(p_community_slug text, p_course_slug text)
RETURNS json
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN (
    SELECT json_build_object(
      'id', c.id,
      'title', c.title,
      'description', c.description,
      'slug', c.slug,
      'chapters', (
        SELECT json_agg(
          json_build_object(
            'id', ch.id,
            'title', ch.title,
            'position', ch.position,
            'lessons', (
              SELECT json_agg(
                json_build_object(
                  'id', l.id,
                  'title', l.title,
                  'content', l.content,
                  'video_asset_id', l.video_asset_id,
                  'playback_id', l.playback_id,
                  'position', l.position,
                  'created_at', l.created_at,
                  'updated_at', l.updated_at,
                  'created_by', l.created_by
                )
                ORDER BY l.position
              )
              FROM lessons l
              WHERE l.chapter_id = ch.id
            )
          )
          ORDER BY ch.position
        )
        FROM chapters ch
        WHERE ch.course_id = c.id
      )
    )
    FROM courses c
    JOIN communities comm ON c.community_id = comm.id
    WHERE comm.slug = p_community_slug
    AND c.slug = p_course_slug
    LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ordered_lessons(course_id_param uuid)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  video_asset_id text,
  playback_id text,
  lesson_position integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid,
  chapter_id uuid
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.content,
    l.video_asset_id,
    l.playback_id,
    l.lesson_position,
    l.created_at,
    l.updated_at,
    l.created_by,
    l.chapter_id
  FROM lessons l
  JOIN chapters c ON l.chapter_id = c.id
  WHERE c.course_id = course_id_param
  ORDER BY c.chapter_position ASC, l.lesson_position ASC;
END;
$function$;

-- =====================================================
-- REORDER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.reorder_chapters(chapter_orders chapter_order[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update all chapters in a single transaction
  FOR i IN 1..array_length(chapter_orders, 1) LOOP
    UPDATE chapters
    SET
      "order" = (chapter_orders[i]).new_order,
      updated_at = NOW()
    WHERE
      id = (chapter_orders[i]).chapter_id
      AND course_id = (chapter_orders[i]).course_id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_lessons(lesson_orders lesson_order[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update all lessons in a single transaction
  FOR i IN 1..array_length(lesson_orders, 1) LOOP
    UPDATE lessons
    SET
      "order" = (lesson_orders[i]).new_order,
      updated_at = NOW()
    WHERE
      id = (lesson_orders[i]).lesson_id
      AND chapter_id = (lesson_orders[i]).chapter_id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_lessons(chapter_id_param uuid, lesson_positions json[])
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  video_asset_id text,
  playback_id text,
  lesson_position integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid,
  chapter_id uuid
)
LANGUAGE plpgsql
AS $function$
DECLARE
  lesson_data JSON;
BEGIN
  -- Update positions in a transaction
  FOR lesson_data IN SELECT * FROM json_array_elements(lesson_positions::json)
  LOOP
    UPDATE lessons
    SET
      lesson_position = (lesson_data->>'position')::INTEGER,
      updated_at = NOW()
    WHERE id = (lesson_data->>'id')::UUID
    AND chapter_id = chapter_id_param;
  END LOOP;

  -- Return the updated lessons
  RETURN QUERY
  SELECT *
  FROM lessons
  WHERE chapter_id = chapter_id_param
  ORDER BY lesson_position ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_lessons(chapter_id_param uuid, lesson_ids uuid[])
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  video_asset_id text,
  playback_id text,
  lesson_position integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid,
  chapter_id uuid
)
LANGUAGE plpgsql
AS $function$
DECLARE
  lesson_id UUID;
  i INTEGER;
BEGIN
  -- Update positions in a transaction
  i := 0;
  FOREACH lesson_id IN ARRAY lesson_ids
  LOOP
    UPDATE lessons
    SET
      lesson_position = i,
      updated_at = NOW()
    WHERE id = lesson_id
    AND chapter_id = chapter_id_param;
    i := i + 1;
  END LOOP;

  -- Return the updated lessons
  RETURN QUERY
  SELECT *
  FROM lessons
  WHERE chapter_id = chapter_id_param
  ORDER BY lesson_position ASC;
END;
$function$;

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_users_by_ids(user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  return query
  select u.id, u.email::text
  from auth.users u
  where u.id = any(user_ids);
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  avatar_url text;
  full_name text;
BEGIN
  -- Get the avatar URL from Google metadata or fallback
  avatar_url := coalesce(
    new.raw_user_meta_data->>'picture',  -- Google OAuth picture
    new.raw_user_meta_data->>'avatar_url',  -- Custom avatar_url
    'https://api.multiavatar.com/' || new.id || '.svg'  -- Fallback avatar
  );

  -- Get the full name from metadata or fallback
  full_name := coalesce(
    new.raw_user_meta_data->>'full_name',  -- Our custom full_name
    new.raw_user_meta_data->>'name',  -- Google OAuth name
    split_part(new.email, '@', 1)  -- Fallback to email username
  );

  -- Update the user's metadata to ensure consistency
  UPDATE auth.users
  SET raw_user_meta_data =
    jsonb_set(
      jsonb_set(
        raw_user_meta_data,
        '{avatar_url}',
        to_jsonb(avatar_url)
      ),
      '{full_name}',
      to_jsonb(full_name)
    )
  WHERE id = new.id;

  -- Insert into profiles with email
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (new.id, full_name, avatar_url, new.email);

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_email(user_id uuid, new_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Check if the executing user is an admin
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = true
    ) THEN
        -- Only update if the email is actually different
        IF EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = user_id
            AND email != new_email
        ) THEN
            -- Update the user's email in auth.users
            UPDATE auth.users
            SET email = new_email,
                updated_at = now()
            WHERE id = user_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Only admins can update user emails';
    END IF;
END;
$function$;

-- =====================================================
-- ADMIN FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND is_admin = true
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  action text,
  resource_type text DEFAULT NULL,
  resource_id text DEFAULT NULL,
  metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;

    INSERT INTO admin_access_log (admin_id, action, resource_type, resource_id, metadata)
    VALUES (auth.uid(), action, resource_type, resource_id, metadata);
END;
$function$;

-- =====================================================
-- PROMOTIONAL PERIOD
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_member_in_promotional_period(
  community_created_at timestamp with time zone,
  member_joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  promotional_duration_days integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if member joined within promotional period of community creation
    RETURN member_joined_at <= (community_created_at + INTERVAL '1 day' * promotional_duration_days);
END;
$function$;

-- =====================================================
-- FEE TIER MANAGEMENT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_community_fee_tier(p_community_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    new_fee_percentage DECIMAL;
    current_member_count INT;
    community_created_at TIMESTAMP WITH TIME ZONE;
    promo_fee DECIMAL;
BEGIN
    -- Get current member count and community creation date
    SELECT active_member_count, created_at, promotional_fee_percentage
    INTO current_member_count, community_created_at, promo_fee
    FROM communities
    WHERE id = p_community_id;

    -- Calculate new fee percentage (standard tiered pricing)
    SELECT calculate_platform_fee_percentage(current_member_count) INTO new_fee_percentage;

    -- Update all current members' fee percentages
    -- Members in promotional period keep 0% fee, others get tiered pricing
    UPDATE community_members
    SET platform_fee_percentage = CASE
        WHEN is_promotional_member AND promotional_period_end > CURRENT_TIMESTAMP THEN promo_fee
        ELSE new_fee_percentage
    END
    WHERE community_id = p_community_id;

    -- Log the fee change
    INSERT INTO fee_changes (community_id, new_member_count, new_fee_percentage)
    VALUES (p_community_id, current_member_count, new_fee_percentage);
END;
$function$;

CREATE OR REPLACE FUNCTION public.test_fee_tiers(p_community_id uuid)
RETURNS TABLE(test_case text, member_count integer, fee_percentage numeric)
LANGUAGE plpgsql
AS $function$
DECLARE
    original_count INT;
BEGIN
    -- Store original count
    SELECT active_member_count INTO original_count
    FROM communities
    WHERE id = p_community_id;

    -- Test Tier 1 (1-50 members)
    UPDATE communities SET active_member_count = 25 WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
    test_case := 'Tier 1 (25 members)';
    member_count := 25;
    SELECT platform_fee_percentage INTO fee_percentage
    FROM community_members
    WHERE community_id = p_community_id
    AND status = 'active'
    LIMIT 1;
    RETURN NEXT;

    -- Test Tier 2 (51-100 members)
    UPDATE communities SET active_member_count = 75 WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
    test_case := 'Tier 2 (75 members)';
    member_count := 75;
    SELECT platform_fee_percentage INTO fee_percentage
    FROM community_members
    WHERE community_id = p_community_id
    AND status = 'active'
    LIMIT 1;
    RETURN NEXT;

    -- Test Tier 3 (101+ members)
    UPDATE communities SET active_member_count = 150 WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
    test_case := 'Tier 3 (150 members)';
    member_count := 150;
    SELECT platform_fee_percentage INTO fee_percentage
    FROM community_members
    WHERE community_id = p_community_id
    AND status = 'active'
    LIMIT 1;
    RETURN NEXT;

    -- Reset to original count
    UPDATE communities SET active_member_count = original_count WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
END;
$function$;

-- =====================================================
-- TRIGGERS - UPDATE FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_community_member_counts()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts when a new member joins
    UPDATE communities
    SET
      active_member_count = active_member_count + 1,
      total_member_count = total_member_count + 1
    WHERE id = NEW.community_id;

    -- Check if this change crosses a tier threshold and update fees
    PERFORM update_community_fee_tier(NEW.community_id);
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'inactive' AND OLD.status = 'active') THEN
    -- Decrement active count when a member leaves or becomes inactive
    UPDATE communities
    SET active_member_count = active_member_count - 1
    WHERE id = OLD.community_id;

    -- Check if this change crosses a tier threshold and update fees
    PERFORM update_community_fee_tier(OLD.community_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status = 'inactive' THEN
    -- Increment active count when a member reactivates
    UPDATE communities
    SET active_member_count = active_member_count + 1
    WHERE id = NEW.community_id;

    -- Check if this change crosses a tier threshold and update fees
    PERFORM update_community_fee_tier(NEW.community_id);
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_community_members_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM increment_members_count(NEW.community_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM decrement_members_count(OLD.community_id);
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_teacher_availability_slots_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_teacher_availability_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_thread_comments_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE threads
    SET comments_count = comments_count + 1
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE threads
    SET comments_count = comments_count - 1
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
