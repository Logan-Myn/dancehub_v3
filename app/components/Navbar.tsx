"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";
import UserAccountNav from "@/components/UserAccountNav";
import { User } from "@supabase/supabase-js";

interface Props {
  initialUser: User | null;
}

export default function Navbar({ initialUser }: Props) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [user, setUser] = useState<User | null>(initialUser);

  const handleAuthClick = (mode: "signin" | "signup") => {
    setAuthMode(mode);
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
              <UserAccountNav user={user} />
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
        mode={authMode}
      />
    </>
  );
}
