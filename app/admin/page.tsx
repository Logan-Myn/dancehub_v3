import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Users, MessageSquare, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getAdminStats() {
  const supabase = createServerComponentClient({ cookies });

  const [
    { count: usersCount },
    { count: communitiesCount },
    { count: threadsCount },
    { data: recentActivity }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('communities').select('*', { count: 'exact', head: true }),
    supabase.from('threads').select('*', { count: 'exact', head: true }),
    supabase.from('admin_access_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  return {
    usersCount,
    communitiesCount,
    threadsCount,
    recentActivity
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const StatCard = ({ title, value, icon: Icon }: { title: string; value: number; icon: any }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          title="Total Threads"
          value={stats.threadsCount || 0}
          icon={MessageSquare}
        />
        <StatCard
          title="Active Subscriptions"
          value={0}
          icon={CreditCard}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity?.map((activity: any) => (
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