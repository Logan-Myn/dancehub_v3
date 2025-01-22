"use client";

import Link from "next/link";

interface CommunityNavbarProps {
  communitySlug: string;
  activePage: string;
  isMember: boolean;
}

export default function CommunityNavbar({ communitySlug, activePage, isMember }: CommunityNavbarProps) {
  const navItems = [
    { label: "Community", href: `/community/${communitySlug}` },
    { label: "Classroom", href: `/community/${communitySlug}/classroom` },
    { label: "About", href: `/community/${communitySlug}/about` },
  ];

  if (!isMember) {
    return null;
  }

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {navItems.map((item) => (
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