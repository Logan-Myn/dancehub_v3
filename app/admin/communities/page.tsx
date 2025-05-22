import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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
  MoreVertical,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Pencil,
  Trash,
} from "lucide-react";
import { EditCommunityButton } from "@/components/admin/edit-community-button";
import { DeleteCommunityButton } from "@/components/admin/delete-community-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Community = {
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

async function getCommunities() {
  const supabase = createServerComponentClient({ cookies });

  // First fetch all communities
  const { data: communities, error: communitiesError } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false });

  if (communitiesError) {
    console.error("Error fetching communities:", communitiesError);
    return [];
  }

  // Then fetch creator profiles, member counts, and Stripe data separately
  const communitiesWithDetails = await Promise.all(
    (communities || []).map(async (community) => {
      const [{ data: creatorData }, { count: membersCount }, stripeData] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", community.created_by)
            .single(),
          supabase
            .from("community_members")
            .select("*", { count: "exact", head: true })
            .eq("community_id", community.id),
          getStripeRevenue(community.stripe_account_id),
        ]);

      return {
        ...community,
        creator: creatorData || { full_name: null, email: null },
        members_count: membersCount || 0,
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
