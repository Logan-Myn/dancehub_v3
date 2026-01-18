import { sql } from '@/lib/db';
import { Users, MessageSquare, CreditCard, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { headers } from 'next/headers';

interface AdminAccessLog {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
}

async function getAdminStats() {
  const headersList = headers();
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = headersList.get('host') || '';
  const baseUrl = `${protocol}://${host}`;

  const [
    usersCountResult,
    communitiesCountResult,
    threadsCountResult,
    recentActivity,
    subscriptionStats
  ] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM profiles`,
    sql`SELECT COUNT(*) as count FROM communities`,
    sql`SELECT COUNT(*) as count FROM threads`,
    sql`SELECT * FROM admin_access_log ORDER BY created_at DESC LIMIT 5`,
    fetch(`${baseUrl}/api/admin/subscriptions`).then(res => res.json())
  ]);

  return {
    usersCount: Number(usersCountResult[0]?.count) || 0,
    communitiesCount: Number(communitiesCountResult[0]?.count) || 0,
    threadsCount: Number(threadsCountResult[0]?.count) || 0,
    recentActivity: recentActivity as AdminAccessLog[],
    subscriptionStats
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const StatCard = ({ title, value, icon: Icon, subtitle }: {
    title: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    subtitle?: string;
  }) => (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
        <CardTitle className="text-xs font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>

      <div className="grid gap-3 grid-cols-5">
        <StatCard
          title="Total Users"
          value={stats.usersCount || 0}
          icon={Users}
        />
        <StatCard
          title="Communities"
          value={stats.communitiesCount || 0}
          icon={MessageSquare}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.subscriptionStats?.total_active_subscriptions || 0}
          icon={CreditCard}
        />
        <StatCard
          title="Communities Revenue"
          value={formatCurrency(stats.subscriptionStats?.total_recurring_revenue || 0)}
          icon={DollarSign}
          subtitle="Total monthly revenue across all communities"
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(stats.subscriptionStats?.platform_revenue || 0)}
          icon={Percent}
          subtitle="Monthly revenue from platform fees"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity?.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col space-y-1 border-b pb-4 last:border-0"
              >
                <p className="text-sm text-muted-foreground">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
                <p className="text-sm">
                  {activity.action} - {activity.resource_type}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
