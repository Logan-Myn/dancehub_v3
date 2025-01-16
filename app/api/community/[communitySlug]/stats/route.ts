import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  const supabase = createAdminClient();
  
  try {
    // Get community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    console.log('Stats API - Found community:', {
      slug: params.communitySlug,
      community,
      error: communityError
    });

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Get total active members count
    const { count: totalMembers, error: membersError } = await supabase
      .from("community_members")
      .select("*", { count: 'exact', head: true })
      .eq("community_id", community.id)
      .eq("status", "active");

    console.log('Stats API - Members count:', {
      totalMembers,
      error: membersError
    });

    if (membersError) {
      console.error("Error fetching members count:", membersError);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    // Get total threads count
    const { data: threadsData, error: threadsError } = await supabase
      .from("threads")
      .select("id, title, community_id")
      .eq("community_id", community.id);

    console.log('Stats API - Thread query debug:', {
      communityId: community.id,
      threadsFound: threadsData?.length || 0,
      threads: threadsData,
      error: threadsError
    });

    const totalThreads = threadsData?.length || 0;

    if (threadsError) {
      console.error("Error fetching threads count:", threadsError);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    // Get monthly revenue (assuming we store this in a subscriptions or payments table)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyPayments, error: revenueError } = await supabase
      .from("payments")
      .select("amount")
      .eq("community_id", community.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Get membership growth (new members in last 30 days)
    const { count: newMembers, error: growthError } = await supabase
      .from("community_members")
      .select("*", { count: 'exact', head: true })
      .eq("community_id", community.id)
      .eq("status", "active")
      .gte("joined_at", thirtyDaysAgo.toISOString());

    // Get active members (members who have posted or commented in last 30 days)
    const { data: activeThreadCreators } = await supabase
      .from("threads")
      .select("created_by")
      .eq("community_id", community.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const activeUserIds = Array.from(new Set(activeThreadCreators?.map(t => t.created_by) || []));

    const { count: activeMembers } = await supabase
      .from("community_members")
      .select("*", { count: 'exact', head: true })
      .eq("community_id", community.id)
      .eq("status", "active")
      .in("user_id", activeUserIds);

    const response = {
      totalMembers: totalMembers || 0,
      monthlyRevenue,
      totalThreads: totalThreads || 0,
      activeMembers: activeMembers || 0,
      membershipGrowth: newMembers || 0
    };

    console.log('Stats API - Final response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching community stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
} 