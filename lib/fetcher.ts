import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const fetcher = async (key: string) => {
  // Parse the key if it contains parameters
  const [resource, ...params] = key.split(':');

  // Fetch community data
  if (resource === 'community') {
    const slug = params[0];
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return {
      ...data,
      membersCount: 0, // Will be updated with members count
      imageUrl: data.image_url,
      threadCategories: data.thread_categories || [],
      customLinks: data.custom_links || [],
      membershipEnabled: data.membership_enabled || false,
      membershipPrice: data.membership_price || 0,
      stripeAccountId: data.stripe_account_id || null,
    };
  }

  // Fetch community members
  if (resource === 'community-members') {
    const communityId = params[0];
    const { data, error } = await supabase
      .from("community_members_with_profiles")
      .select("*")
      .eq("community_id", communityId);

    if (error) throw error;
    return data.map(member => ({
      ...member,
      profile: {
        id: member.user_id,
        full_name: member.full_name || "Anonymous",
        avatar_url: member.avatar_url,
      },
    }));
  }

  // Fetch community threads
  if (resource === 'community-threads') {
    const communityId = params[0];
    const { data: threadsData, error } = await supabase
      .from("threads")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get all unique user IDs from threads
    const userIds = Array.from(new Set(threadsData.map(thread => thread.user_id)));

    // Fetch profiles for these users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, display_name")
      .in("id", userIds);

    // Create a map of profiles for easy lookup
    const profilesMap = (profilesData || []).reduce((acc: any, profile: any) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    return threadsData.map(thread => {
      const profile = profilesMap[thread.user_id];
      return {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        createdAt: thread.created_at,
        userId: thread.user_id,
        author: {
          name: profile?.display_name || profile?.full_name || "Anonymous",
          image: profile?.avatar_url || "",
        },
        category: thread.category || "General",
        category_type: thread.category_type || null,
        categoryId: thread.category_id,
        likesCount: thread.likes?.length || 0,
        commentsCount: thread.comments?.length || 0,
        likes: thread.likes || [],
        comments: thread.comments || [],
        pinned: thread.pinned || false,
      };
    });
  }

  // Fetch all communities for discovery
  if (key === 'communities') {
    const { data, error } = await supabase
      .from('communities')
      .select(`
        *,
        community_members:community_members(count)
      `)
      .throwOnError();

    if (error) throw error;

    return data.map(community => ({
      ...community,
      membersCount: community.community_members[0]?.count || 0
    }));
  }

  // Fetch user's communities for dashboard
  if (key.startsWith('user-communities:')) {
    const userId = key.split(':')[1];
    const { data: memberCommunities, error: memberError } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    if (memberCommunities && memberCommunities.length > 0) {
      const communityIds = memberCommunities.map(mc => mc.community_id);
      const { data: communities, error: communitiesError } = await supabase
        .from('communities')
        .select(`
          *,
          members:community_members(count)
        `)
        .in('id', communityIds);

      if (communitiesError) throw communitiesError;
      
      return communities?.map(community => ({
        ...community,
        members_count: community.members[0]?.count || 0
      })) || [];
    }
    return [];
  }

  // Fetch courses for a community
  if (key.startsWith('courses:')) {
    const [_, communityId, visibility] = key.split(':');
    let query = supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        image_url,
        created_at,
        updated_at,
        slug,
        community_id,
        is_public
      `)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    // If visibility is public, only show public courses
    if (visibility === 'public') {
      query = query.eq("is_public", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  if (key.startsWith('profile:')) {
    const userId = key.split(':')[1];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  // Fetch a specific course with chapters and lessons
  if (key.startsWith('course:')) {
    const [_, communitySlug, courseSlug] = key.split(':');
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
      `/api/community/${communitySlug}/courses/${courseSlug}`,
      {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch course');
    }

    const data = await response.json();
    return data;
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