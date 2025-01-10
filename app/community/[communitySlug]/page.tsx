import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import ClientCommunityPage from "./client-page";
import { Suspense } from "react";

async function getCommunityData(communitySlug: string) {
  const supabase = createServerClient();
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", communitySlug)
    .single();

  return community;
}

async function getMembers(communityId: string) {
  const supabase = createServerClient();
  const { data: members, count } = await supabase
    .from("community_members")
    .select("profiles(*)", { count: "exact" })
    .eq("community_id", communityId);

  return { members: members || [], totalMembers: count || 0 };
}

async function getThreads(communityId: string) {
  const supabase = createServerClient();
  const { data: threads } = await supabase
    .from("threads")
    .select(`
      *,
      author:profiles(*)
    `)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  return threads || [];
}

async function checkMembership(communityId: string, userId: string | undefined) {
  if (!userId) return false;
  
  const supabase = createServerClient();
  const { data } = await supabase
    .from("community_members")
    .select("*")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

export default async function CommunityPage({
  params,
}: {
  params: { communitySlug: string };
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const currentUser = session?.user || null;

  const community = await getCommunityData(params.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  const [{ members, totalMembers }, threads] = await Promise.all([
    getMembers(community.id),
    getThreads(community.id)
  ]);

  const isMember = await checkMembership(community.id, currentUser?.id);
  const isCreator = currentUser?.id === community.created_by;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientCommunityPage
        community={community}
        initialMembers={members}
        initialTotalMembers={totalMembers}
        initialThreads={threads}
        initialIsMember={isMember}
        currentUser={currentUser}
        isCreator={isCreator}
      />
    </Suspense>
  );
}
