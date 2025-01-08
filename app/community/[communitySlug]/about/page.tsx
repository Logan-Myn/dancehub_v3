"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import PageBuilder from "@/components/PageBuilder";
import { Section } from "@/types/page-builder";
import { toast } from "react-hot-toast";

interface Community {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  aboutPage?: {
    sections: Section[];
    meta: {
      lastUpdated: string;
      publishedVersion?: string;
    };
  };
}

export default function AboutPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCommunityData() {
      try {
        const response = await fetch(`/api/community/${communitySlug}`);
        const data = await response.json();
        setCommunity(data);
      } catch (error) {
        console.error("Error fetching community data:", error);
        toast.error("Failed to load community data");
      } finally {
        setIsLoading(false);
      }
    }

    if (communitySlug) {
      fetchCommunityData();
    }
  }, [communitySlug]);

  const handleSectionsChange = (sections: Section[]) => {
    if (community) {
      setCommunity({
        ...community,
        aboutPage: {
          sections,
          meta: {
            lastUpdated: new Date().toISOString(),
            publishedVersion: community.aboutPage?.meta.publishedVersion,
          },
        },
      });
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/community/${communitySlug}/about`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aboutPage: community?.aboutPage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save about page");
      }

      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error saving about page:", error);
      toast.error("Failed to save changes");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!community) {
    return <div>Community not found</div>;
  }

  const isCreator = user?.uid === community.createdBy;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="about" />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageBuilder
            initialSections={community.aboutPage?.sections || []}
            onChange={handleSectionsChange}
            onSave={handleSave}
            isEditing={isCreator}
          />
        </div>
      </main>
    </div>
  );
} 