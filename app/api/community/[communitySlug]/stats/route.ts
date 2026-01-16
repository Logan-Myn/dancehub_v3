import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

interface Community {
  id: string;
  created_by: string;
}

interface Thread {
  id: string;
  title: string;
  community_id: string;
}

interface Payment {
  amount: number | null;
}

interface MemberCount {
  count: number;
}

interface ThreadCreator {
  created_by: string;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    // Get community
    const community = await queryOne<Community>`
      SELECT id, created_by
      FROM communities
      WHERE slug = ${params.communitySlug}
    `;

    console.log('Stats API - Found community:', {
      slug: params.communitySlug,
      community
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Get total active members count (excluding creator)
    const membersResult = await queryOne<MemberCount>`
      SELECT COUNT(*)::int as count
      FROM community_members
      WHERE community_id = ${community.id}
        AND user_id != ${community.created_by}
    `;

    const totalMembers = membersResult?.count || 0;

    console.log('Stats API - Members count:', {
      totalMembers
    });

    // Get total threads count
    const threadsData = await query<Thread>`
      SELECT id, title, community_id
      FROM threads
      WHERE community_id = ${community.id}
    `;

    console.log('Stats API - Thread query debug:', {
      communityId: community.id,
      threadsFound: threadsData?.length || 0,
      threads: threadsData
    });

    const totalThreads = threadsData?.length || 0;

    // Get monthly revenue (assuming we store this in a subscriptions or payments table)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get current month's revenue
    const monthlyPayments = await query<Payment>`
      SELECT amount
      FROM payments
      WHERE community_id = ${community.id}
        AND created_at >= ${thirtyDaysAgo.toISOString()}
    `;

    // Get previous month's revenue
    const previousMonthPayments = await query<Payment>`
      SELECT amount
      FROM payments
      WHERE community_id = ${community.id}
        AND created_at >= ${sixtyDaysAgo.toISOString()}
        AND created_at < ${thirtyDaysAgo.toISOString()}
    `;

    const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const previousMonthRevenue = previousMonthPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Calculate revenue growth percentage
    const revenueGrowth = previousMonthRevenue === 0
      ? 100 // If previous month was 0, then it's 100% growth
      : Math.round(((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);

    // Get membership growth (new members in last 30 days)
    const newMembersResult = await queryOne<MemberCount>`
      SELECT COUNT(*)::int as count
      FROM community_members
      WHERE community_id = ${community.id}
        AND status = 'active'
        AND joined_at >= ${thirtyDaysAgo.toISOString()}
    `;

    const newMembers = newMembersResult?.count || 0;

    // Get active members (members who have posted or commented in last 30 days)
    const activeThreadCreators = await query<ThreadCreator>`
      SELECT created_by
      FROM threads
      WHERE community_id = ${community.id}
        AND created_at >= ${thirtyDaysAgo.toISOString()}
    `;

    const activeUserIds = Array.from(new Set(activeThreadCreators?.map(t => t.created_by) || []));

    // Get active members (members with active status)
    const activeMembersResult = await queryOne<MemberCount>`
      SELECT COUNT(*)::int as count
      FROM community_members
      WHERE community_id = ${community.id}
        AND status = 'active'
    `;

    const activeMembers = activeMembersResult?.count || 0;

    const response = {
      totalMembers: totalMembers || 0,
      monthlyRevenue,
      revenueGrowth,
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
