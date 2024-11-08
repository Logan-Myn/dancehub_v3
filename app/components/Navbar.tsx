"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import AuthModal from "@/components/auth/AuthModal";
import UserAccountNav from "@/components/UserAccountNav";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";

export default function Navbar() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

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
                <Button 
                  onClick={() => handleAuthClick("signup")}
                >
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