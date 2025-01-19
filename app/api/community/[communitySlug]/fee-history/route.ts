import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabase = createAdminClient();

interface FeeStats {
  platform_fee_percentage: number;
  count: number;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    // Get community ID from slug
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get fee change history
    const { data: feeHistory, error: feeError } = await supabase
      .from("fee_changes")
      .select("*")
      .eq("community_id", community.id)
      .order("changed_at", { ascending: false });

    if (feeError) {
      console.error("Error fetching fee history:", feeError);
      return NextResponse.json(
        { error: "Failed to fetch fee history" },
        { status: 500 }
      );
    }

    // Get current fee statistics
    const { data: currentStats, error: statsError } = await supabase
      .rpc('get_fee_statistics', { community_id: community.id })
      .throwOnError() as { data: FeeStats[], error: null };

    if (statsError) {
      console.error("Error fetching fee statistics:", statsError);
      return NextResponse.json(
        { error: "Failed to fetch fee statistics" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feeHistory,
      currentStats: currentStats?.map((stat: FeeStats) => ({
        feePercentage: stat.platform_fee_percentage,
        memberCount: stat.count
      }))
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 