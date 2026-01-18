import { sql } from '@/lib/db';
import { stripe } from "@/lib/stripe";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { EditCommunityButton } from "@/components/admin/edit-community-button";
import { DeleteCommunityButton } from "@/components/admin/delete-community-button";

type CommunityBase = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  created_by: string;
  membership_enabled: boolean;
  membership_price: number | null;
  stripe_account_id: string | null;
};

type Community = CommunityBase & {
  creator: {
    full_name: string | null;
    email: string;
  };
  members_count: number;
  total_revenue: number;
  platform_fees: number;
};

async function getStripeRevenue(stripeAccountId: string | null) {
  if (!stripeAccountId) return { revenue: 0, fees: 0 };

  try {
    // Fetch balance transactions for the connected account
    const balanceTransactions = await stripe.balanceTransactions.list(
      { limit: 100 },
      { stripeAccount: stripeAccountId }
    );

    // Calculate totals from transactions
    const totals = balanceTransactions.data.reduce(
      (acc, transaction) => {
        if (transaction.type === "charge") {
          return {
            revenue: acc.revenue + transaction.amount,
            fees: acc.fees + transaction.fee,
          };
        }
        return acc;
      },
      { revenue: 0, fees: 0 }
    );

    return {
      revenue: totals.revenue / 100, // Convert from cents to dollars
      fees: totals.fees / 100,
    };
  } catch (error) {
    console.error("Error fetching Stripe data:", error);
    return { revenue: 0, fees: 0 };
  }
}

async function getCommunities(): Promise<Community[]> {
  // First fetch all communities
  const communities = await sql`
    SELECT id, name, slug, description, image_url, created_at, created_by,
           membership_enabled, membership_price, stripe_account_id
    FROM communities
    ORDER BY created_at DESC
  ` as CommunityBase[];

  if (!communities || communities.length === 0) {
    return [];
  }

  // Get unique creator IDs
  const creatorIds = Array.from(new Set(communities.map(c => c.created_by)));
  const communityIds = communities.map(c => c.id);

  // Fetch creators and member counts in parallel
  const [creators, memberCounts] = await Promise.all([
    sql`
      SELECT auth_user_id, full_name, email
      FROM profiles
      WHERE auth_user_id = ANY(${creatorIds})
    `,
    sql`
      SELECT community_id, COUNT(*) as count
      FROM community_members
      WHERE community_id = ANY(${communityIds})
      GROUP BY community_id
    `
  ]) as [
    { auth_user_id: string; full_name: string | null; email: string }[],
    { community_id: string; count: number }[]
  ];

  // Create lookup maps
  const creatorMap = new Map(creators.map(c => [c.auth_user_id, c]));
  const memberCountMap = new Map(memberCounts.map(m => [m.community_id, Number(m.count)]));

  // Fetch Stripe data for each community (needs to be done sequentially due to rate limits)
  const communitiesWithDetails: Community[] = await Promise.all(
    communities.map(async (community) => {
      const stripeData = await getStripeRevenue(community.stripe_account_id);
      const creator = creatorMap.get(community.created_by);

      return {
        ...community,
        creator: creator || { full_name: null, email: '' },
        members_count: memberCountMap.get(community.id) || 0,
        total_revenue: stripeData.revenue,
        platform_fees: stripeData.fees,
      };
    })
  );

  return communitiesWithDetails;
}

export default async function CommunitiesPage() {
  const communities = await getCommunities();

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Communities</h2>
        <div className="flex items-center gap-4">
          <Input placeholder="Search communities..." className="w-[300px]" />
          <Button>Export</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Community</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Platform Fees</TableHead>
              <TableHead>Stripe Connected</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {communities.map((community: Community) => (
              <TableRow key={community.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={community.image_url || undefined} />
                      <AvatarFallback>
                        {community.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <a
                        href={`/${community.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {community.name}
                      </a>
                      {community.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {community.description}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {community.creator.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {community.creator.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{community.members_count}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {community.membership_enabled ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatCurrency(community.membership_price)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Disabled</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-green-600">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(community.total_revenue)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-green-600">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(community.platform_fees)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {community.stripe_account_id ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <XCircle className="h-3 w-3" /> Not Connected
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {new Date(community.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <EditCommunityButton
                      communityId={community.id}
                      communityName={community.name}
                      communityDescription={community.description || ""}
                      communitySlug={community.slug}
                    />
                    <DeleteCommunityButton
                      communityId={community.id}
                      communityName={community.name}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
