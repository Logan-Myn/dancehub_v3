import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { useState } from "react";
import SignOutButton from "./auth/SignOutButton";
import { fetchWithAuth } from "@/lib/utils";

interface CommunityNavbarProps {
  communitySlug: string;
  activePage: "community" | "classroom" | "calendar" | "about";
}

export default function CommunityNavbar({
  communitySlug,
  activePage,
}: CommunityNavbarProps) {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userAvatar = user?.photoURL || null;

  const handleCommunityAction = async (action: string) => {
    if (!user) return;

    try {
      const response = await fetchWithAuth(`/api/community/${action}`, {
        method: "POST",
        body: JSON.stringify({ communitySlug }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} community`);

      // Handle success (e.g., update UI, show toast, etc.)
    } catch (error) {
      console.error(`Error ${action}ing community:`, error);
      // Handle error (e.g., show error toast)
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-3xl font-bold text-black">
            DanceHub
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </Button>

            {loading ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2"
                >
                  {userAvatar ? (
                    <Image
                      src={userAvatar}
                      alt={user.displayName || "User"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {user.displayName?.[0] || user.email?.[0] || "?"}
                      </span>
                    </div>
                  )}
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu">
                      <div className="px-4 py-2 text-sm text-gray-700">
                        {user.displayName || user.email}
                      </div>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Settings
                      </Link>
                      <div className="border-t border-gray-100">
                        <SignOutButton className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex space-x-8 py-4">
            <li>
              <NavItem
                href={`/community/${communitySlug}`}
                active={activePage === "community"}
              >
                Community
              </NavItem>
            </li>
            <li>
              <NavItem
                href={`/community/${communitySlug}/classroom`}
                active={activePage === "classroom"}
              >
                Classroom
              </NavItem>
            </li>
            <li>
              <NavItem
                href={`/community/${communitySlug}/calendar`}
                active={activePage === "calendar"}
              >
                Calendar
              </NavItem>
            </li>
            <li>
              <NavItem
                href={`/community/${communitySlug}/about`}
                active={activePage === "about"}
              >
                About
              </NavItem>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}

function NavItem({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-${
        active ? "gray-900 font-semibold" : "gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}
