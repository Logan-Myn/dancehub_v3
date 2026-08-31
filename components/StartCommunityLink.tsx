"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

/**
 * Link to the create-a-community flow. Signed-out visitors stay where they are
 * and get the sign-up modal, then land on /onboarding once they're in. Without
 * the intercept the click navigates to /onboarding, which has nothing to show a
 * signed-out visitor and sends them back here.
 */
export function StartCommunityLink({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { user, loading } = useAuth();
  const { showAuthModal } = useAuthModal();

  return (
    <Link
      href="/onboarding"
      className={className}
      style={style}
      onClick={(e) => {
        // While the session is still resolving, let the navigation through —
        // /onboarding sorts it out rather than us guessing wrong.
        if (loading || user) return;
        e.preventDefault();
        showAuthModal("signup", "/onboarding");
      }}
    >
      {children}
    </Link>
  );
}
