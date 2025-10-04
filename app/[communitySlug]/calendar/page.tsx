"use client";

import { useState, useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import WeekCalendar from "@/components/WeekCalendar";
import { toast } from "react-hot-toast";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  created_by: string;
  created_at: string;
}

const reservedPaths = [
  'admin',
  'discovery',
  'onboarding',
  'login',
  'register',
  'dashboard',
  'api',
  'auth',
  'components',
  'fonts',
  'favicon.ico',
  'globals.css',
  'robots.txt',
  'sitemap.xml',
];

export default function CommunityCalendarPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user, loading: isAuthLoading } = useAuth();
  const supabase = createClient();

  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  if (reservedPaths.includes(communitySlug)) {
    notFound();
  }

  useEffect(() => {
    if (!isAuthLoading) {
      fetchCommunityData();
    }
  }, [communitySlug, user, isAuthLoading]);

  const fetchCommunityData = async () => {
    try {
      // Fetch community data
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', communitySlug)
        .single();

      if (communityError || !communityData) {
        notFound();
        return;
      }

      setCommunity(communityData);
      setIsCreator(user?.id === communityData.created_by);

      // Check membership if user is logged in
      if (user) {
        const { data: memberData } = await supabase
          .from('community_members')
          .select('*')
          .eq('community_id', communityData.id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        setIsMember(!!memberData);
      }
    } catch (error) {
      console.error('Error fetching community data:', error);
      toast.error('Failed to load community data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!community) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <CommunityNavbar 
        communitySlug={communitySlug} 
        activePage="calendar" 
        isMember={isMember}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {community.name} Calendar
          </h1>
          <p className="mt-2 text-gray-600">
            View and join scheduled live dance classes
          </p>
        </div>

        <WeekCalendar
          communityId={community.id}
          communitySlug={communitySlug}
          isTeacher={isCreator || isMember} // Allow both creators and members to be teachers for now
        />
      </main>
    </div>
  );
}