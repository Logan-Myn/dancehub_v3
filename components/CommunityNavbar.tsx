"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface CommunityNavbarProps {
  communitySlug: string;
  activePage: string;
}

export default function CommunityNavbar({ communitySlug, activePage }: CommunityNavbarProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkMembership() {
      if (!user) {
        setIsMember(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get community ID first
        const { data: communityData } = await supabase
          .from("communities")
          .select("id")
          .eq("slug", communitySlug)
          .single();

        if (!communityData) {
          setIsMember(false);
          setIsLoading(false);
          return;
        }

        // Check membership
        const { data: memberData } = await supabase
          .from("community_members")
          .select("*")
          .eq("community_id", communityData.id)
          .eq("user_id", user.id)
          .maybeSingle();

        setIsMember(!!memberData);
      } catch (error) {
        console.error("Error checking membership:", error);
        setIsMember(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkMembership();
  }, [user, communitySlug]);

  const navItems = [
    { label: "Community", href: `/community/${communitySlug}`, membersOnly: true },
    { label: "Classroom", href: `/community/${communitySlug}/classroom`, membersOnly: true },
    { label: "About", href: `/community/${communitySlug}/about`, membersOnly: false },
  ];

  if (isLoading) {
    return null;
  }

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {navItems
              .filter(item => !item.membersOnly || (item.membersOnly && isMember))
              .map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium ${
                    activePage === item.label.toLowerCase()
                      ? "border-black text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </nav>
  );
} 