/**
 * SWR Fetcher - Uses API routes instead of direct database access
 * Migrated from Supabase to Better Auth + Neon architecture
 */

export const fetcher = async (key: string) => {
  // Parse the key if it contains parameters
  const [resource, ...params] = key.split(':');

  // Fetch community data by slug
  if (resource === 'community') {
    const slug = params[0];
    const response = await fetch(`/api/community/${slug}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch community');
    }

    const data = await response.json();
    return {
      ...data,
      imageUrl: data.image_url,
      threadCategories: data.thread_categories || [],
      customLinks: data.custom_links || [],
      membershipEnabled: data.membership_enabled || false,
      membershipPrice: data.membership_price || 0,
      stripeAccountId: data.stripe_account_id || null,
    };
  }

  // Fetch community members by slug
  if (resource === 'community-members') {
    const communitySlug = params[0];
    const response = await fetch(`/api/community/${communitySlug}/members`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch members');
    }

    const data = await response.json();
    return (data.members || []).map((member: any) => ({
      ...member,
      profile: {
        id: member.user_id,
        full_name: member.displayName || "Anonymous",
        avatar_url: member.imageUrl,
      },
    }));
  }

  // Fetch community threads by slug
  if (resource === 'community-threads') {
    const communitySlug = params[0];
    const response = await fetch(`/api/community/${communitySlug}/threads`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch threads');
    }

    return response.json();
  }

  // Fetch all communities for discovery
  if (key === 'communities') {
    const response = await fetch('/api/communities', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch communities');
    }

    return response.json();
  }

  // Fetch communities with membership status for a user
  if (key.startsWith('communities:')) {
    const userId = key.split(':')[1];
    const response = await fetch(`/api/communities?userId=${userId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch communities');
    }

    return response.json();
  }

  // Fetch user's communities for dashboard
  if (key.startsWith('user-communities:')) {
    const userId = key.split(':')[1];
    const response = await fetch(`/api/user/${userId}/communities`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user communities');
    }

    return response.json();
  }

  // Fetch courses for a community
  if (key.startsWith('courses:')) {
    const [_, communityId, visibility] = key.split(':');
    const visibilityParam = visibility === 'public' ? '?visibility=public' : '';
    const response = await fetch(`/api/courses?communityId=${communityId}${visibilityParam}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch courses');
    }

    return response.json();
  }

  // Fetch user profile
  if (key.startsWith('profile:')) {
    const userId = key.split(':')[1];
    const response = await fetch(`/api/profile?userId=${userId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  }

  // Fetch a specific course with chapters and lessons
  if (key.startsWith('course:')) {
    const [_, communitySlug, courseSlug] = key.split(':');

    const response = await fetch(
      `/api/community/${communitySlug}/courses/${courseSlug}`,
      {
        credentials: 'include',
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch course');
    }

    return response.json();
  }

  throw new Error(`No fetcher defined for key ${key}`);
};

// Types
export interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  membersCount?: number;
  members_count?: number;
  privacy?: string;
  slug: string;
  created_at: string;
  created_by: string;
  threadCategories?: ThreadCategory[];
  customLinks?: CustomLink[];
  membershipEnabled?: boolean;
  membershipPrice?: number;
  stripeAccountId?: string | null;
  isMember?: boolean;
  status?: 'active' | 'pre_registration' | 'inactive';
  opening_date?: string | null;
}

export interface ThreadCategory {
  id: string;
  name: string;
  iconType?: string;
}

export interface CustomLink {
  title: string;
  url: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  display_name?: string | null;
} 