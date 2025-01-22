"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import Navbar from "@/app/components/Navbar";

interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  membersCount: number;
  privacy?: string;
  slug: string;
}

export default function Home() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();

  useEffect(() => {
    async function fetchCommunities() {
      try {
        // First get all communities
        const { data: communitiesData, error: communitiesError } = await supabase
          .from('communities')
          .select('*');

        if (communitiesError) throw communitiesError;

        // Then get member counts for each community
        const communitiesWithCounts = await Promise.all(
          (communitiesData || []).map(async (community) => {
            const { count, error: membersError } = await supabase
              .from('community_members')
              .select('*', { count: 'exact', head: true })
              .eq('community_id', community.id);

            if (membersError) throw membersError;

            return {
              ...community,
              membersCount: count || 0,
            } as Community;
          })
        );

        setCommunities(communitiesWithCounts);
      } catch (error) {
        console.error("Error fetching communities:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommunities();
  }, []);

  const handleCreateCommunity = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!user) {
      e.preventDefault();
      showAuthModal("signup");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <main>
          <h2 className="text-4xl font-bold text-center mb-4">
            Discover dance communities
          </h2>
          <p className="text-center mb-8">
            or{" "}
            <Link
              href="/community/onboarding"
              className="text-blue-500 hover:underline"
              onClick={handleCreateCommunity}
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

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : communities.length === 0 ? (
            <div className="text-center text-gray-500">No communities found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className="border rounded-lg overflow-hidden shadow-lg"
                >
                  <div className="relative w-full h-48">
                    <Image
                      alt={community.name}
                      src={community.image_url || "/placeholder.svg"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={false}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-2">
                      {community.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {community.description || "No description available"}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {community.privacy || "Public"} • {community.membersCount}{" "}
                        Members
                      </span>
                      <Link href={`/community/${community.slug}`}>
                        <Button variant="outline">Join</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
