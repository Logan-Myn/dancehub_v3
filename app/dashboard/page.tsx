"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Calendar } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/auth";
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MyBookedLessons from "@/components/MyBookedLessons";

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
  const router = useRouter();
  const { user, loading: isAuthLoading } = useAuth();
  const { data: communities, error, isLoading: isDataLoading } = useSWR<Community[]>(
    user ? `user-communities:${user.id}` : null,
    fetcher
  );

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  // Show nothing while checking auth
  if (isAuthLoading) {
    return null;
  }

  // If not authenticated, don't show anything (will redirect)
  if (!user) {
    return null;
  }

  // Show loading spinner only when fetching data
  if (isDataLoading) {
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
            <div className="text-2xl font-bold">{communities?.length || 0}</div>
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

      {/* My Booked Lessons Section */}
      <div>
        <MyBookedLessons />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Communities</h2>
        {error ? (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-red-500">Error loading communities. Please try again later.</p>
            </CardContent>
          </Card>
        ) : !communities || communities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-gray-500 mb-4">You haven't joined any communities yet.</p>
              <Link 
                href="/discovery"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Discover communities
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Link key={community.id} href={`/${community.slug}`}>
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-[300px] flex flex-col hover:-translate-y-1">
                  <div className="aspect-video relative overflow-hidden rounded-t-xl">
                    <img
                      src={community.image_url || '/placeholder.svg'}
                      alt={community.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="flex flex-col flex-grow p-3">
                    <h3 className="font-semibold text-lg mb-1">{community.name}</h3>
                    <p className="text-sm text-gray-500 mb-2 flex-grow line-clamp-2">
                      {community.description || "No description available"}
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