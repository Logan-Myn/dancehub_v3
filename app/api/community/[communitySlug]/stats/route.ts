import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    // Get community
    const { data: community, error: communityError } = await supabaseAdmin
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Get total active members count
    const { count: totalMembers, error: membersError } = await supabaseAdmin
      .from("community_members")
      .select("*", { count: 'exact', head: true })
      .eq("community_id", community.id)
      .eq("status", "active");

    if (membersError) {
      console.error("Error fetching members count:", membersError);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    // Get total threads count
    const { count: totalThreads, error: threadsError } = await supabaseAdmin
      .from("threads")
      .select("*", { count: 'exact', head: true })
      .eq("community_id", community.id);

    if (threadsError) {
      console.error("Error fetching threads count:", threadsError);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    // Get monthly revenue (assuming we store this in a subscriptions or payments table)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyPayments, error: revenueError } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("community_id", community.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Get membership growth (new members in last 30 days)
    const { count: newMembers, error: growthError } = await supabaseAdmin
      .from("community_members")
      .select("*", { count: 'exact', head: true })
      .eq("community_id", community.id)
      .eq("status", "active")
      .gte("joined_at", thirtyDaysAgo.toISOString());

    // Get active members (members who have posted or commented in last 30 days)
    const { data: activeThreadCreators } = await supabaseAdmin
      .from("threads")
      .select("created_by")
      .eq("community_id", community.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const activeUserIds = Array.from(new Set(activeThreadCreators?.map(t => t.created_by) || []));

    const { count: activeMembers } = await supabaseAdmin
      .from("community_members")
      .select("*", { count: 'exact', head: true })
      .eq("community_id", community.id)
      .eq("status", "active")
      .in("user_id", activeUserIds);

    return NextResponse.json({
      totalMembers: totalMembers || 0,
      monthlyRevenue,
      totalThreads: totalThreads || 0,
      activeMembers: activeMembers || 0,
      membershipGrowth: newMembers || 0
    });
  } catch (error) {
    console.error("Error fetching community stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
} 