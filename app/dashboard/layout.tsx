"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Settings, Home, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Navbar from "@/app/components/Navbar";

const navItems = [
  { name: "Overview", icon: Home, href: "/dashboard" },
  { name: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const SidebarContent = (
    <div className="flex h-full flex-col bg-[#0F1729] text-gray-300">
      <div className="flex items-center h-20 px-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <div
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                pathname === item.href
                  ? "bg-[#1C2A4E] text-white"
                  : "hover:bg-[#1C2A4E] hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Navbar />
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-72 md:flex-col min-h-screen">
          {SidebarContent}
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden fixed top-20 left-4 z-40"
              onClick={() => setIsOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-[#0F1729] w-72">
            {SidebarContent}
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
} 