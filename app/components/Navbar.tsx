"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import AuthModal from "@/components/auth/AuthModal";
import UserAccountNav from "@/components/UserAccountNav";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Navbar() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initialTab, setInitialTab] = useState<"signin" | "signup">("signin");
  const [profile, setProfile] = useState<Profile | null>(null);
  const { user } = useAuth();
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

  const handleAuthClick = (tab: "signin" | "signup") => {
    setInitialTab(tab);
    setShowAuthModal(true);
  };

  return (
    <>
      <nav className="border-b py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            DanceHub
          </Link>

          <div className="flex gap-4 items-center">
            {user ? (
              <UserAccountNav user={user} profile={profile} />
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => handleAuthClick("signin")}
                >
                  Sign In
                </Button>
                <Button onClick={() => handleAuthClick("signup")}>
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={initialTab}
      />
    </>
  );
}
