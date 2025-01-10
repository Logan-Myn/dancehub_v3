import { Suspense } from "react";
import { createPagesServerClient } from "@/lib/supabase";
import ClientClassroom from "./client-page";

interface Community {
  id: string;
  name: string;
  created_by: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  slug: string;
}

async function getCommunityData(communitySlug: string) {
  const supabase = createPagesServerClient();
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", communitySlug)
    .single();

  return community;
}

async function getCourses(communityId: string) {
  const supabase = createPagesServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      image_url,
      created_at,
      updated_at,
      slug,
      community_id
    `)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  return courses || [];
}

async function checkMembership(communityId: string, userId: string | undefined) {
  if (!userId) return false;
  
  const supabase = createPagesServerClient();
  const { data } = await supabase
    .from("community_members")
    .select("*")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

export default async function ClassroomPage({
  params,
}: {
  params: { communitySlug: string };
}) {
  const supabase = createPagesServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const currentUser = session?.user || null;

  const community = await getCommunityData(params.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  const [courses, isMember] = await Promise.all([
    getCourses(community.id),
    checkMembership(community.id, currentUser?.id)
  ]);

  const isCreator = currentUser?.id === community.created_by;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientClassroom
        community={community}
        initialCourses={courses}
        communitySlug={params.communitySlug}
        currentUser={currentUser}
        initialIsMember={isMember}
        isCreator={isCreator}
      />
    </Suspense>
  );
}
