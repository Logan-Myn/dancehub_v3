# DanceHub Supabase Schema Backup

> **Backup Date:** January 2025
> **Project ID:** rmnndxnjzacfhrbixxfo
> **Region:** eu-central-1

---

## Summary

| Type | Count |
|------|-------|
| **Tables** | 22 |
| **Views** | 3 |
| **Total Objects** | 25 |

---

## Public Schema Views (3 views)

### community_members_with_profiles
Joins community_members with profiles for display name and avatar.

### lesson_bookings_with_details
Joins lesson_bookings with private_lessons, communities, and profiles.

### live_classes_with_details
Joins live_classes with profiles and communities. Includes computed `is_currently_active` and `is_starting_soon` fields.

> **Note:** Full view definitions are in `views_backup.sql`

---

## Public Schema Tables (22 tables)

### 1. profiles
Primary user profile table linked to auth.users

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| created_at | timestamptz | NO | timezone('utc', now()) |
| updated_at | timestamptz | NO | timezone('utc', now()) |
| full_name | text | YES | - |
| avatar_url | text | YES | - |
| stripe_account_id | text | YES | - |
| display_name | text | YES | - |
| is_admin | boolean | YES | false |
| email | text | NO | - |

**Primary Key:** id
**Foreign Keys:** profiles.id -> auth.users.id

---

### 2. communities
Dance communities with Stripe integration

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| created_at | timestamptz | NO | timezone('utc', now()) |
| name | text | NO | - |
| slug | text | NO | UNIQUE |
| description | text | YES | - |
| image_url | text | YES | - |
| created_by | uuid | NO | - |
| price | numeric | YES | CHECK >= 0 |
| currency | text | YES | - |
| membership_enabled | boolean | YES | false |
| membership_price | numeric | YES | CHECK >= 0 |
| stripe_account_id | text | YES | - |
| thread_categories | jsonb | YES | - |
| custom_links | jsonb | YES | '[]' |
| updated_at | timestamptz | NO | timezone('utc', now()) |
| about_page | jsonb | YES | - |
| members_count | integer | YES | 0 |
| stripe_product_id | text | YES | - |
| stripe_price_id | text | YES | - |
| active_member_count | integer | YES | 0 |
| total_member_count | integer | YES | 0 |
| stripe_onboarding_type | text | YES | 'express' |
| promotional_period_start | timestamptz | YES | - |
| promotional_period_end | timestamptz | YES | - |
| promotional_fee_percentage | numeric | YES | 0.0 |
| status | text | YES | 'active' CHECK IN ('active', 'pre_registration', 'inactive') |
| opening_date | timestamptz | YES | - |
| can_change_opening_date | boolean | YES | true |

**Primary Key:** id
**Foreign Keys:** communities.created_by -> auth.users.id

---

### 3. community_members
Community membership tracking with Stripe subscriptions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES | - |
| community_id | uuid | YES | - |
| role | text | YES | 'member' |
| created_at | timestamptz | NO | timezone('utc', now()) |
| joined_at | timestamptz | YES | CURRENT_TIMESTAMP |
| status | text | YES | 'active' CHECK IN ('active', 'pending', 'inactive', 'pending_pre_registration', 'pre_registered') |
| payment_intent_id | text | YES | - |
| subscription_id | text | YES | - |
| subscription_status | text | YES | CHECK IN (active, canceled, incomplete, incomplete_expired, past_due, trialing, unpaid) |
| current_period_end | timestamptz | YES | - |
| stripe_customer_id | text | YES | - |
| stripe_subscription_id | text | YES | - |
| last_payment_date | timestamptz | YES | - |
| platform_fee_percentage | numeric | YES | - |
| is_promotional_member | boolean | YES | false |
| promotional_period_end | timestamptz | YES | - |
| pre_registration_payment_method_id | text | YES | - |
| stripe_invoice_id | text | YES | - |
| pre_registration_date | timestamptz | YES | - |

**Primary Key:** id
**Foreign Keys:**
- community_members.user_id -> auth.users.id
- community_members.community_id -> communities.id

---

### 4. courses
Course content organization

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO | - |
| description | text | YES | - |
| image_url | text | YES | - |
| created_at | timestamptz | NO | timezone('utc', now()) |
| updated_at | timestamptz | NO | timezone('utc', now()) |
| slug | text | NO | - |
| community_id | uuid | YES | - |
| created_by | uuid | YES | - |
| is_public | boolean | YES | true |

**Primary Key:** id
**Foreign Keys:**
- courses.community_id -> communities.id
- courses.created_by -> auth.users.id

---

### 5. chapters
Course chapter organization

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| title | text | NO | - |
| chapter_position | integer | NO | - |
| course_id | uuid | NO | - |
| created_at | timestamptz | NO | timezone('utc', now()) |
| updated_at | timestamptz | NO | timezone('utc', now()) |

**Primary Key:** id
**Foreign Keys:** chapters.course_id -> courses.id

---

### 6. lessons
Individual lesson content with Mux video

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| title | text | NO | - |
| content | text | YES | - |
| video_asset_id | text | YES | - |
| lesson_position | integer | NO | - |
| chapter_id | uuid | NO | - |
| created_at | timestamptz | NO | timezone('utc', now()) |
| updated_at | timestamptz | NO | timezone('utc', now()) |
| created_by | uuid | YES | - |
| playback_id | text | YES | - |

**Primary Key:** id
**Foreign Keys:**
- lessons.chapter_id -> chapters.id
- lessons.created_by -> auth.users.id

---

### 7. lesson_completions
Track user lesson progress

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO | - |
| lesson_id | uuid | NO | - |
| completed_at | timestamptz | YES | now() |

**Primary Key:** id
**Foreign Keys:**
- lesson_completions.user_id -> auth.users.id
- lesson_completions.lesson_id -> lessons.id

---

### 8. threads
Community forum threads

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| created_at | timestamptz | NO | timezone('utc', now()) |
| title | text | NO | - |
| content | text | NO | - |
| user_id | uuid | NO | - |
| community_id | uuid | NO | - |
| category_id | text | YES | - |
| likes | uuid[] | YES | '{}' |
| comments | jsonb[] | YES | '{}' |
| created_by | uuid | NO | - |
| updated_at | timestamptz | NO | timezone('utc', now()) |
| author_name | text | YES | - |
| author_image | text | YES | - |
| comments_count | integer | YES | 0 |
| category_name | text | YES | - |
| pinned | boolean | YES | false |

**Primary Key:** id
**Foreign Keys:**
- threads.user_id -> auth.users.id
- threads.community_id -> communities.id
- threads.created_by -> auth.users.id

---

### 9. comments
Thread comments with replies

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| thread_id | uuid | NO | - |
| user_id | uuid | NO | - |
| content | text | NO | - |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP |
| updated_at | timestamptz | YES | CURRENT_TIMESTAMP |
| parent_id | uuid | YES | - |
| author | jsonb | YES | - |
| likes | text[] | YES | '{}' |
| likes_count | integer | YES | 0 |

**Primary Key:** id
**Foreign Keys:**
- comments.thread_id -> threads.id
- comments.user_id -> auth.users.id
- comments.parent_id -> comments.id

---

### 10. private_lessons
Private lesson offerings

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| community_id | uuid | NO | - |
| title | text | NO | - |
| description | text | YES | - |
| duration_minutes | integer | NO | 60 |
| regular_price | numeric | NO | CHECK >= 0 |
| member_price | numeric | YES | - |
| member_discount_percentage | numeric | YES | GENERATED |
| is_active | boolean | YES | true |
| max_bookings_per_month | integer | YES | - |
| requirements | text | YES | - |
| location_type | text | YES | 'online' CHECK IN ('online', 'in_person', 'both') |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| teacher_id | uuid | NO | - |

**Primary Key:** id
**Foreign Keys:**
- private_lessons.community_id -> communities.id
- private_lessons.teacher_id -> auth.users.id

---

### 11. lesson_bookings
Private lesson booking records with Daily.co integration

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| private_lesson_id | uuid | NO | - |
| community_id | uuid | NO | - |
| student_id | uuid | NO | - |
| student_email | text | NO | - |
| student_name | text | YES | - |
| is_community_member | boolean | YES | false |
| price_paid | numeric | NO | - |
| stripe_payment_intent_id | text | YES | UNIQUE |
| payment_status | text | YES | 'pending' CHECK IN ('pending', 'succeeded', 'failed', 'canceled') |
| lesson_status | text | YES | 'booked' CHECK IN ('booked', 'scheduled', 'completed', 'canceled') |
| scheduled_at | timestamptz | YES | - |
| student_message | text | YES | - |
| teacher_notes | text | YES | - |
| contact_info | jsonb | YES | '{}' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| daily_room_name | text | YES | - |
| daily_room_url | text | YES | - |
| daily_room_created_at | timestamptz | YES | - |
| daily_room_expires_at | timestamptz | YES | - |
| teacher_daily_token | text | YES | - |
| student_daily_token | text | YES | - |
| teacher_joined_at | timestamptz | YES | - |
| student_joined_at | timestamptz | YES | - |
| session_started_at | timestamptz | YES | - |
| session_ended_at | timestamptz | YES | - |
| recording_id | text | YES | - |
| recording_url | text | YES | - |
| video_call_started_at | timestamptz | YES | - |
| video_call_ended_at | timestamptz | YES | - |
| availability_slot_id | uuid | YES | - |

**Primary Key:** id
**Foreign Keys:**
- lesson_bookings.private_lesson_id -> private_lessons.id
- lesson_bookings.community_id -> communities.id
- lesson_bookings.student_id -> auth.users.id
- lesson_bookings.availability_slot_id -> teacher_availability_slots.id

---

### 12. teacher_availability_slots
Teacher scheduling system

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| teacher_id | uuid | YES | - |
| community_id | uuid | YES | - |
| availability_date | date | NO | - |
| start_time | time | NO | - |
| end_time | time | NO | - |
| is_active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

**Primary Key:** id
**Foreign Keys:**
- teacher_availability_slots.teacher_id -> auth.users.id
- teacher_availability_slots.community_id -> communities.id

---

### 13. live_classes
Live online dance classes

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| community_id | uuid | NO | - |
| teacher_id | uuid | NO | - |
| title | text | NO | - |
| description | text | YES | - |
| scheduled_start_time | timestamptz | NO | - |
| duration_minutes | integer | NO | 60 |
| daily_room_name | text | YES | - |
| daily_room_url | text | YES | - |
| daily_room_token_teacher | text | YES | - |
| daily_room_expires_at | timestamptz | YES | - |
| status | text | NO | 'scheduled' CHECK IN ('scheduled', 'live', 'ended', 'cancelled') |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

**Primary Key:** id
**Foreign Keys:**
- live_classes.community_id -> communities.id
- live_classes.teacher_id -> auth.users.id

---

### 14. live_class_participants
Live class attendance tracking

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| live_class_id | uuid | NO | - |
| student_id | uuid | NO | - |
| joined_at | timestamptz | YES | now() |
| left_at | timestamptz | YES | - |
| created_at | timestamptz | YES | now() |

**Primary Key:** id
**Foreign Keys:**
- live_class_participants.live_class_id -> live_classes.id
- live_class_participants.student_id -> auth.users.id

---

### 15. notifications
User notification system

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO | - |
| title | text | NO | - |
| message | text | NO | - |
| link | text | YES | - |
| read | boolean | YES | false |
| created_at | timestamptz | NO | timezone('utc', now()) |
| type | text | NO | CHECK IN ('course_published', 'course_updated', 'announcement', 'other') |

**Primary Key:** id
**Foreign Keys:** notifications.user_id -> auth.users.id

---

### 16. subscriptions
Stripe subscription tracking

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| created_at | timestamptz | NO | timezone('utc', now()) |
| user_id | uuid | NO | - |
| customer_id | text | NO | - |
| subscription_id | text | NO | - |
| status | text | NO | CHECK IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid') |
| trial_end | timestamptz | YES | - |
| current_period_end | timestamptz | NO | - |

**Primary Key:** id
**Foreign Keys:** subscriptions.user_id -> auth.users.id

---

### 17. stripe_onboarding_progress
Stripe Connect onboarding state

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| community_id | uuid | NO | - |
| stripe_account_id | text | NO | UNIQUE |
| current_step | integer | YES | 1 |
| completed_steps | integer[] | YES | '{}' |
| business_info | jsonb | YES | '{}' |
| personal_info | jsonb | YES | '{}' |
| bank_account | jsonb | YES | '{}' |
| documents | jsonb | YES | '[]' |
| verification_completed_at | timestamptz | YES | - |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

**Primary Key:** id
**Foreign Keys:** stripe_onboarding_progress.community_id -> communities.id

---

### 18. fee_changes
Platform fee change history

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| community_id | uuid | YES | - |
| previous_member_count | integer | YES | - |
| new_member_count | integer | YES | - |
| new_fee_percentage | numeric | YES | - |
| changed_at | timestamptz | YES | CURRENT_TIMESTAMP |

**Primary Key:** id
**Foreign Keys:** fee_changes.community_id -> communities.id

---

### 19. admin_access_log
Admin action audit trail

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| admin_id | uuid | YES | - |
| action | text | NO | - |
| resource_type | text | YES | - |
| resource_id | text | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamptz | NO | timezone('utc', now()) |

**Primary Key:** id
**Foreign Keys:** admin_access_log.admin_id -> auth.users.id

---

### 20. email_change_requests
Email change verification tokens

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | YES | - |
| new_email | text | NO | - |
| token | text | NO | UNIQUE |
| expires_at | timestamptz | NO | - |
| created_at | timestamptz | YES | now() |

**Primary Key:** id
**Foreign Keys:** email_change_requests.user_id -> auth.users.id

---

### 21. password_reset_requests
Password reset tokens

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | YES | - |
| email | text | NO | - |
| token | text | NO | UNIQUE |
| expires_at | timestamptz | NO | - |
| created_at | timestamptz | YES | now() |

**Primary Key:** id
**Foreign Keys:** password_reset_requests.user_id -> auth.users.id

---

### 22. signup_verifications
Email verification for signup

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | YES | - |
| email | text | NO | - |
| token | text | NO | UNIQUE |
| expires_at | timestamptz | NO | - |
| created_at | timestamptz | YES | now() |
| redirect_to | text | NO | '/' |

**Primary Key:** id
**Foreign Keys:** signup_verifications.user_id -> auth.users.id

---

## Storage Buckets

| Bucket ID | Name | Public | File Count | Total Size |
|-----------|------|--------|------------|------------|
| avatars | avatars | true | 1 | 402 KB |
| images | images | true | 14 | 3.2 MB |
| course-images | course-images | true | 11 | 791 KB |
| community-images | community-images | true | 10 | 1.3 MB |

**Total Files:** 36
**Total Size:** ~5.7 MB

---

## Applied Migrations (15)

1. 20250523015145_add_stripe_onboarding_progress_fixed
2. 20250526112605_add_promotional_fee_system
3. 20250707110433_create_private_lessons_tables
4. 20250811010703_add_daily_co_fields_to_lesson_bookings
5. 20250812085253_teacher_availability_slots_fixed
6. 20250812085313_teacher_availability_view
7. 20250812104437_drop_teacher_availability_view
8. 20250812105356_recreate_teacher_availability_simplified
9. 20250812124033_add_teacher_id_to_private_lessons
10. 20250815111708_add_daily_co_fields
11. 20250902084249_add_availability_slot_id_to_bookings
12. 20250911044649_create_live_classes
13. 20250912085736_update_live_classes_view
14. 20251004091515_add_community_status_and_pre_registration
15. 20251004091540_add_pre_registration_fields_to_members
