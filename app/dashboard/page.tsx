"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  Video,
  Star,
  ChevronRight,
  Plus,
  Sparkles,
  BookOpen,
  Trophy,
  Target
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MyBookedLessons from "@/components/MyBookedLessons";
import { format } from 'date-fns';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: communities, error, isLoading: isDataLoading } = useSWR<Community[]>(
    user ? `user-communities:${user.id}` : null,
    fetcher
  );

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Calculate stats
  const totalCommunities = communities?.length || 0;
  const upcomingLessons = 0; // This would come from lesson bookings
  const weeklyGoal = 3; // Example weekly goal
  const weeklyProgress = 1; // Example progress

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-blue-500">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-semibold">
                  {getUserInitials(user?.email || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {getGreeting()}, {user?.email?.split('@')[0]}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {format(currentTime, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Communities</CardTitle>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCommunities}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Active member
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Upcoming Lessons</CardTitle>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{upcomingLessons}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This week</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Weekly Goal</CardTitle>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{weeklyProgress}/{weeklyGoal}</div>
              <Progress value={(weeklyProgress / weeklyGoal) * 100} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950 dark:to-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Practice Streak</CardTitle>
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">7</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                Days in a row
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Actions
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Button 
              variant="secondary" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              asChild
            >
              <Link href="/profile" className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                View Schedule
              </Link>
            </Button>
            <Button 
              variant="secondary" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              asChild
            >
              <Link href="/settings" className="flex items-center justify-center gap-2">
                <BookOpen className="h-4 w-4" />
                Account Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* My Booked Lessons Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <MyBookedLessons />
        </div>

        {/* Your Communities Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Communities</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Stay connected with your dance family</p>
            </div>
          </div>
          
          {error ? (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
              <CardContent className="text-center py-6">
                <p className="text-red-600 dark:text-red-400">Error loading communities. Please try again later.</p>
              </CardContent>
            </Card>
          ) : !communities || communities.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">No communities yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">You haven't joined any dance communities yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {communities.slice(0, 6).map((community) => (
                <Link key={community.id} href={`/${community.slug}`} className="group">
                  <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                    <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                      <img
                        src={community.image_url || '/placeholder.svg'}
                        alt={community.name}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Badge className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                        <Users className="h-3 w-3 mr-1" />
                        {community.members_count || 0}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {community.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                        {community.description || "Explore this vibrant dance community"}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                              <Avatar key={i} className="h-6 w-6 border-2 border-white dark:border-gray-800">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                  {String.fromCharCode(65 + i)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {community.members_count > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{community.members_count - 3}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}