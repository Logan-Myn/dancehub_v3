"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import UserAccountNav from "@/components/UserAccountNav";
import NotificationsButton from "@/components/NotificationsButton";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile() {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      }
    }

    fetchProfile();
  }, [user]);

  return (
    <nav className="border-b py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          DanceHub
        </Link>

        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <NotificationsButton />
              <UserAccountNav user={user} profile={profile} />
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
