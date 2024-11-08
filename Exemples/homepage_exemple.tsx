"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllCommunities, isCommunityMember } from '@/lib/db';
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

// Helper function remains the same...
function extractTextFromJSON(jsonString: string): string {
  try {
    const json = JSON.parse(jsonString);
    if (typeof json === 'object' && json.content) {
      return json.content.map((item: any) => {
        if (item.content) {
          return item.content.map((contentItem: any) => contentItem.text || '').join(' ');
        }
        return '';
      }).join(' ');
    }
    return jsonString;
  } catch (e) {
    return jsonString;
  }
}

export default function Home() {
  const { user, loading } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [communitiesWithMembership, setCommunitiesWithMembership] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const communitiesData = await getAllCommunities();
        if (!mounted) return;
        
        setCommunities(communitiesData);

        const withMembership = await Promise.all(
          communitiesData.map(async (community) => {
            if (user?.uid) {
              const isMember = await isCommunityMember(community.id, user.uid);
              return { 
                ...community, 
                isMember,
                description: extractTextFromJSON(community.description)
              };
            }
            return { 
              ...community, 
              isMember: false,
              description: extractTextFromJSON(community.description)
            };
          })
        );
        if (!mounted) return;
        
        setCommunitiesWithMembership(withMembership);
      } catch (error) {
        console.error('Error fetching communities:', error);
        if (mounted) {
          toast.error('Failed to load communities');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Navbar />
      <main>
        <h2 className="text-4xl font-bold text-center mb-4">
          Discover dance communities
        </h2>
        <p className="text-center mb-8">
          or{" "}
          <Link
            href="/community/onboarding"
            className="text-blue-500 hover:underline"
          >
            create your own
          </Link>
        </p>
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search dance styles, teachers, and more"
            type="search"
          />
        </div>
        <div className="flex space-x-4 mb-8 overflow-x-auto">
          <Button variant="secondary">All</Button>
          <Button variant="ghost">Ballet</Button>
          <Button variant="ghost">Hip Hop</Button>
          <Button variant="ghost">Contemporary</Button>
          <Button variant="ghost">Salsa</Button>
          <Button variant="ghost">Breakdancing</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {communitiesWithMembership.map((community) => (
            <div
              key={community.id}
              className="border rounded-lg overflow-hidden shadow-lg"
            >
              <Image
                alt={community.name}
                className="w-full h-48 object-cover"
                height="200"
                src={
                  community.imageUrl ||
                  `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(
                    community.name
                  )}`
                }
                style={{
                  aspectRatio: "300/200",
                  objectFit: "cover",
                }}
                width="300"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{community.name}</h3>
                <p className="text-gray-600 mb-4">{community.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {community.privacy} • {community.membersCount || 0} Members
                  </span>
                  <Link href={`/community/${community.slug}`}>
                    <Button variant="outline">
                      {community.isMember ? "View" : "Join"}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}