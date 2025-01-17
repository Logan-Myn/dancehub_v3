"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/auth";
import Link from "next/link";
import { Users, Calendar } from "lucide-react";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  members_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function fetchCommunities() {
      if (!user) return;

      try {
        const { data: memberCommunities, error: memberError } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        if (memberCommunities && memberCommunities.length > 0) {
          const communityIds = memberCommunities.map(mc => mc.community_id);
          const { data: communities, error: communitiesError } = await supabase
            .from('communities')
            .select('*')
            .in('id', communityIds);

          if (communitiesError) throw communitiesError;
          setCommunities(communities || []);
        }
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommunities();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600">Welcome back{user?.email ? `, ${user.email}` : ''}!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Communities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date().toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Communities</h2>
        {communities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-gray-500 mb-4">You haven't joined any communities yet.</p>
              <Link 
                href="/"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Discover communities
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Link key={community.id} href={`/community/${community.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-video relative overflow-hidden rounded-t-xl">
                    <img
                      src={community.image_url || '/placeholder.svg'}
                      alt={community.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-2">{community.name}</h3>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                      {community.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{community.members_count || 0} members</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 