"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import UserAccountNav from "@/components/UserAccountNav";
import NotificationsButton from "@/components/NotificationsButton";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { createClient } from "@/lib/supabase/client";
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Navbar() {
  const { user, loading: isAuthLoading } = useAuth();
  const { showAuthModal } = useAuthModal();
  const supabase = createClient();
  
  // Use SWR for profile fetching
  const { data: profile } = useSWR<Profile>(
    user ? `profile:${user.id}` : null,
    fetcher
  );

  return (
    <nav className="border-b py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          DanceHub
        </Link>

        <div className="flex gap-4 items-center">
          {isAuthLoading ? (
            // Show empty space while loading to prevent layout shift
            <div className="w-[200px]" />
          ) : user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <NotificationsButton />
              <UserAccountNav user={user} profile={profile || null} />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => showAuthModal("signin")}
              >
                Sign In
              </Button>
              <Button onClick={() => showAuthModal("signup")}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
