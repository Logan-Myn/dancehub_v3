# DanceHub Product Requirements Document (PRD)
Version 1.1

## Overview
**Project Name:** DanceHub

**Description:** DanceHub is an innovative online platform designed to foster community building and educational experiences for dancers, instructors, and dance enthusiasts. Teachers can create communities for their students, and within these communities, they can create and manage dance courses. The platform features video sharing, live streaming, discussion forums, and gamification elements to enhance engagement.

## 1. Core Technologies and Tools
- **Frontend:** NextJS, Shadcn, TailwindCSS, Lucide Icons
- **Backend & Database:** Firebase
- **Authentication:** Firebase Auth
- **Video Hosting & Streaming:** Mux
- **Payments:** Stripe
- **State Management:** React Context API
- **Styling:** TailwindCSS
- **Routing:** NextJS File-based routing

## 2. File Structure
```
├── README.md                      # Project overview and setup instructions
├── app/
│   ├── favicon.ico
│   ├── fonts/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/                 
│   │   ├── page.tsx
│   │   ├── teacher.tsx            # Teacher-specific dashboard
│   │   └── student.tsx            # Student-specific dashboard
│   ├── community/                 
│   │   ├── onboarding.tsx             # Create community page and onboarding flow
│   │   └── [communitySlug]/         
│   │       ├── page.tsx           # Main community page
│   │       ├── forum.tsx          # Community forum page
│   │       └── courses/           # Courses within the community
│   │           ├── create.tsx     # Create course inside the community
│   │           └── [courseSlug]/
│   │               ├── page.tsx   # Main course page
│   │               └── live.tsx   # Live streaming page
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   ├── VideoPlayer.tsx
│   ├── Calendar.tsx
│   ├── Forms/
│   │   ├── CreateCommunityForm.tsx
│   │   └── CreateCourseForm.tsx
│   ├── UI/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── Card.tsx
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts
│   ├── mux.ts
│   ├── clerk.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useCommunity.ts
├── context/
│   ├── AuthContext.tsx
├── styles/
│   ├── tailwind.config.ts
│   └── globals.css
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── yarn.lock
```

## 3. Functionalities & Implementation Guidelines

### 3.1 Community Creation and Interaction
**Description:** Teachers can create communities for their students. Within these communities, teachers can initiate threads, share videos, and post announcements.

**UI Elements:**
- "Create Community" button on the teacher dashboard
- Form with fields:
  - Community Name
  - Description
  - Cover Image
  - Privacy Settings (Public/Private)

**Code Example:**
```tsx
<CreateCommunityForm
  fields={[
    { name: 'communityName', label: 'Community Name', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'privacy', label: 'Privacy', type: 'radio', options: ['Public', 'Private'] }
  ]}
/>
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "communityId": "abc123",
    "communityName": "Hip-Hop Dancers",
    "description": "A community for hip-hop dancers."
  }
}
```

### 3.2 Dance Course Creation (Within Communities Only)
**Description:** Instructors can create dance courses only within an existing community. Courses include videos, live streams, and downloadable resources.

**UI Elements:**
- "Create Course" button visible only within a community page
- Multi-step form for course creation, including:
  - Course Name
  - Video Upload

**Code Example:**
```tsx
<CreateCourseForm
  communityId={communityId} // The course must be tied to a community
  fields={[
    { name: 'courseName', label: 'Course Name', type: 'text' },
    { name: 'videoUpload', label: 'Upload Video', type: 'file' },
    { name: 'schedule', label: 'Schedule', type: 'datetime-local' }
  ]}
/>
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "courseId": "xyz456",
    "courseName": "Hip-Hop Basics",
    "schedule": "2024-11-05T15:00:00Z",
    "communityId": "abc123"
  }
}
```

**Key Notes:**
- Courses cannot exist outside of a community.
- Each course is linked to the specific community through the communityId field.

### 3.3 Gamification and Engagement
**Description:** DanceHub employs a point system, badges, and leaderboards to boost engagement. Users earn points through class participation, thread engagement, and completing challenges.

**UI Elements:**
- Points and ranks are displayed on user profiles and leaderboards.
- Badges and achievements are displayed on the user profile.

**Leaderboard Example:**
```tsx
<Leaderboard
  entries={[
    { username: 'dancer_1', points: 1500 },
    { username: 'dancer_2', points: 1200 }
  ]}
/>
```

**Response Example:**
```json
{
  "status": "success",
  "data": [
    { "username": "dancer_1", "points": 1500 },
    { "username": "dancer_2", "points": 1200 }
  ]
}
```

### 3.4 Payments (Stripe Integration)
**Description:** Payments are managed via Stripe for class memberships and other premium content within communities.

**Example Stripe Integration:**
```javascript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Dance Class Membership',
      },
      unit_amount: 5000,
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: 'https://yourdomain.com/success',
  cancel_url: 'https://yourdomain.com/cancel',
});
```

**Response Example:**
```json
{
  "status": "success",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_a1b2c3"
}
```

## 4. Documentation Links
For further details, developers should refer to the following documentation:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Mux Documentation](https://docs.mux.com)
- [Stripe Documentation](https://stripe.com/docs)

## 5. Video Upload and Playback (Mux Integration)
**Description:** DanceHub uses Mux for video storage, playback, and live streaming. Instructors can upload pre-recorded videos for their courses, or they can host live streams that students can join in real-time.

**UI Elements:**
- "Share Video" button for uploading video content in communities
- Video player with basic controls (play, pause, seek, volume)
- Comments section below videos for feedback

**Code Example for Video Upload:**
```tsx
const handleVideoUpload = async (file) => {
  const uploadResponse = await mux.uploads.create({
    new_asset_settings: { playback_policy: 'public' },
    file
  });

  if (uploadResponse.status === 'success') {
    console.log('Video uploaded successfully:', uploadResponse.asset_id);
  }
};
```

**Response Example (Mux Upload):**
```json
{
  "status": "success",
  "data": {
    "asset_id": "mux_asset_789",
    "playback_url": "https://stream.mux.com/mux_asset_789.m3u8"
  }
}
```

## 6. API and Database Structure

### 6.1 Supabase Database Schema
**Tables:**

**communities:**
- id: UUID (Primary Key)
- name: String
- description: Text
- style: String (e.g., Hip-Hop, Salsa)
- is_private: Boolean
- created_by: UUID (Foreign Key to users table)

**courses:**
- id: UUID (Primary Key)
- community_id: UUID (Foreign Key to communities table)
- name: String
- description: Text
- schedule: Timestamp
- video_url: String (Mux playback URL)
- created_by: UUID (Foreign Key to users table)

**users:**
- id: UUID (Primary Key)
- email: String
- password_hash: String
- name: String
- profile_picture: String
- bio: Text

**threads:**
- id: UUID (Primary Key)
- community_id: UUID (Foreign Key to communities table)
- content: Text
- created_by: UUID (Foreign Key to users table)

## 7. Endpoints Overview

### API Endpoints:

1. **Community Endpoints:**
   - GET /api/communities: Fetch all communities
   - POST /api/communities: Create a new community
   - GET /api/communities/{communityId}: Fetch a specific community by ID

2. **Course Endpoints:**
   - POST /api/courses: Create a course (within a community)
   - GET /api/courses/{courseId}: Fetch a specific course

3. **Forum Endpoints:**
   - POST /api/communities/{communityId}/threads: Create a new forum thread
   - GET /api/communities/{communityId}/threads: Fetch all threads within a community

## 8. Error Handling and Validation
- Input validation for all forms
- File upload limits for video sizes and formats
- Standardized error messages

**Example (Validation for Class Creation):**
```tsx
if (!courseName) {
  return {
    status: 'error',
    message: 'Course name is required.'
  };
}
```

## 9. Caching and Performance Considerations
- Content Caching using NextJS static generation
- Lazy loading for videos and assets
- Optimized database queries

## 10. User Permissions & Role-Based Access Control (RBAC)
- Teachers: Create and manage communities, courses, and live streams
- Students: Join communities, attend courses, participate in threads
- Admins: Full platform management access

**Example Role-Based Access Check:**
```tsx
if (user.role !== 'teacher') {
  return {
    status: 'error',
    message: 'Access denied. Only teachers can create courses.'
  };
}
```