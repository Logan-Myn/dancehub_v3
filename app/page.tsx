"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import Navbar from "./components/Navbar";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface Community {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  membersCount?: number;
  privacy?: string;
  slug: string;
}

export default function Home() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCommunities() {
      try {
        const communitiesRef = collection(db, 'communities');
        const snapshot = await getDocs(communitiesRef);
        const communitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          membersCount: doc.data().members?.length || 0,
        })) as Community[];

        setCommunities(communitiesData);
      } catch (error) {
        console.error('Error fetching communities:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommunities();
  }, []);

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

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center text-gray-500">
            No communities found
          </div>
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
                    src={community.imageUrl || "/placeholder.svg"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={false}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{community.name}</h3>
                  <p className="text-gray-600 mb-4">
                    {community.description || "No description available"}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {community.privacy || "Public"} • {community.membersCount} Members
                    </span>
                    <Link href={`/community/${community.slug}`}>
                      <Button variant="outline">
                        Join
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
