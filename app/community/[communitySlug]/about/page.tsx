"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import PageBuilder from "@/components/PageBuilder";
import { Section } from "@/types/page-builder";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string;
  about_page?: {
    sections: Section[];
    meta: {
      last_updated: string;
      published_version?: string;
    };
  };
}

export default function AboutPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initial data fetch
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("*, about_page")
          .eq("slug", communitySlug)
          .single();

        if (communityError) {
          throw communityError;
        }

        if (!communityData) {
          notFound();
          return;
        }

        setCommunity(communityData);
      } catch (error) {
        console.error("Error fetching community:", error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    if (communitySlug) {
      fetchData();
    }
  }, [communitySlug]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!community?.id) return;

    const channel = supabase
      .channel(`community_${community.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'communities',
          filter: `id=eq.${community.id}`,
        },
        (payload) => {
          const updatedCommunity = payload.new as Community;
          if (updatedCommunity.about_page?.meta.last_updated !== community.about_page?.meta.last_updated) {
            setCommunity(updatedCommunity);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [community?.id]);

  const handleSectionsChange = (sections: Section[]) => {
    if (!community) return;
    
    setCommunity((prev) => ({
      ...prev!,
      about_page: {
        sections,
        meta: {
          last_updated: new Date().toISOString(),
          published_version: prev?.about_page?.meta.published_version,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!user || !community?.id) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { error } = await supabase
        .from('communities')
        .update({
          about_page: community.about_page,
          updated_at: new Date().toISOString(),
        })
        .eq('id', community.id)
        .eq('created_by', user.id);

      if (error) {
        throw error;
      }

      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error saving about page:", error);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return <div>Error loading community: {error.message}</div>;
  }

  if (isLoading || !community) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const isCreator = user?.id === community.created_by;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="about" />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageBuilder
            initialSections={community.about_page?.sections || []}
            onChange={handleSectionsChange}
            onSave={handleSave}
            isEditing={isCreator}
            isSaving={isSaving}
          />
        </div>
      </main>
    </div>
  );
} 