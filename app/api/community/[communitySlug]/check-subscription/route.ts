import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

interface CommunityId {
  id: string;
}

interface MemberStatus {
  status: string | null;
  subscription_status: string | null;
}

// GET handler for check-subscription (via query params)
export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { communitySlug } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get community data
    const community = await queryOne<CommunityId>`
      SELECT id
      FROM communities
      WHERE slug = ${communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check member status
    const member = await queryOne<MemberStatus>`
      SELECT status, subscription_status
      FROM community_members
      WHERE community_id = ${community.id}
        AND user_id = ${userId}
    `;

    if (!member) {
      return NextResponse.json({
        hasSubscription: false,
        message: 'Not a member of this community'
      });
    }

    // Check if member is active
    const isActive = member.status === 'active';

    return NextResponse.json({
      hasSubscription: isActive,
      status: member.status,
      subscriptionStatus: member.subscription_status,
      message: isActive ? 'Member is active' : 'Member is not active'
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId } = await request.json();
    const { communitySlug } = params;

    // Get community data
    const community = await queryOne<CommunityId>`
      SELECT id
      FROM communities
      WHERE slug = ${communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check member status
    const member = await queryOne<MemberStatus>`
      SELECT status, subscription_status
      FROM community_members
      WHERE community_id = ${community.id}
        AND user_id = ${userId}
    `;

    if (!member) {
      return NextResponse.json({
        hasSubscription: false,
        message: 'Not a member of this community'
      });
    }

    // Check if member is active
    const isActive = member.status === 'active';

    return NextResponse.json({
      hasSubscription: isActive,
      status: member.status,
      subscriptionStatus: member.subscription_status,
      message: isActive ? 'Member is active' : 'Member is not active'
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
}
