"use client";

import Link from "next/link";

interface CommunityNavbarProps {
  communitySlug: string;
  activePage: string;
  isMember: boolean;
}

export default function CommunityNavbar({ communitySlug, activePage, isMember }: CommunityNavbarProps) {
  const navItems = [
    { label: "Community", href: `/${communitySlug}` },
    { label: "Classroom", href: `/${communitySlug}/classroom`, memberOnly: true },
    { label: "Private Lessons", href: `/${communitySlug}/private-lessons`, memberOnly: false },
    { label: "About", href: `/${communitySlug}/about` },
  ];

  // Filter items based on membership status
  const visibleItems = navItems.filter(item => 
    !item.memberOnly || isMember
  );

  return (
    <nav className="bg-white border-b" id="navigation-tabs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex" id="navigation-tab-buttons">
            {visibleItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium ${
                  activePage === item.label.toLowerCase()
                    ? "border-black text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
                id={`tab-${item.label.toLowerCase()}`}
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