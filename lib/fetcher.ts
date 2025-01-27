import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const fetcher = async (key: string) => {
  // Fetch user profile
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
} 