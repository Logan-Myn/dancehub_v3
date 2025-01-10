import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ClientCommunityPage from "./client-page";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";

export default async function CommunityPage({
  params,
}: {
  params: { communitySlug: string };
}) {
  const supabase = createServerComponentClient({ cookies });

  try {
    // Get current user first
    const { data: { user } } = await supabase.auth.getUser();
    const currentUser = user;

    // Get community data
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("*")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return notFound();
    }

    // Get members
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("*")
      .eq("community_id", community.id);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      throw membersError;
    }

    // Get threads
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("*")
      .eq("community_id", community.id)
      .order("created_at", { ascending: false });

    if (threadsError) {
      console.error("Error fetching threads:", threadsError);
      throw threadsError;
    }

    // Get profiles for thread authors
    const userIds = Array.from(new Set(threads.map(thread => thread.user_id)));
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Create a map of user profiles
    const profileMap = new Map(profiles?.map(profile => [profile.id, profile]));

    // Check if user is a member
    const isMember = currentUser ? members.some(member => member.user_id === currentUser.id) : false;
    
    // Check if user is creator
    const isCreator = currentUser?.id === community.created_by;

    // Format community data
    const formattedCommunity = {
      ...community,
      membersCount: members.length,
      createdBy: community.created_by,
      imageUrl: community.image_url,
    };

    // Format threads data
    const formattedThreads = threads.map(thread => {
      const authorProfile = profileMap.get(thread.user_id);
      return {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        createdAt: thread.created_at,
        userId: thread.user_id,
        likesCount: (thread.likes || []).length,
        commentsCount: (thread.comments || []).length,
        category: thread.category,
        categoryId: thread.category_id,
        author: {
          name: authorProfile?.full_name || "Anonymous",
          image: authorProfile?.avatar_url || "",
        },
        likes: thread.likes,
        comments: thread.comments,
      };
    });

    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <Navbar initialUser={currentUser} />
        <CommunityNavbar communitySlug={params.communitySlug} activePage="community" />

        <Suspense
          fallback={
            <div className="flex justify-center items-center min-h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <ClientCommunityPage
            community={formattedCommunity}
            initialMembers={members}
            initialTotalMembers={members.length}
            initialThreads={formattedThreads}
            initialIsMember={isMember}
            currentUser={currentUser}
            isCreator={isCreator}
          />
        </Suspense>

        <footer className="bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
            © 2024 DanceHub. All rights reserved.
          </div>
        </footer>
      </div>
    );
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
