"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommunityNavbar from "@/components/CommunityNavbar";
import PageBuilder from "@/components/PageBuilder";
import { Section } from "@/types/page-builder";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase";
import { Database } from "@/types/supabase";

interface Community {
  id: string;
  name: string;
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

interface Props {
  community: Community;
}

export default function ClientAboutPage({ community: initialCommunity }: Props) {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community>(initialCommunity);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!community.id) return;

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
  }, [community.id, supabase]);

  const handleSectionsChange = (sections: Section[]) => {
    setCommunity((prev) => ({
      ...prev,
      about_page: {
        sections,
        meta: {
          last_updated: new Date().toISOString(),
          published_version: prev.about_page?.meta.published_version,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!user || !community.id) return;

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
        .eq('created_by', user.id); // Ensure user owns the community

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

  const isCreator = user?.id === community.created_by;

  if (!community) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
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
    </>
  );
} 