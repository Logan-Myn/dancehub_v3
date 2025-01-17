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
  { name: "My Communities", icon: Users, href: "/dashboard/communities" },
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
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="flex items-center h-16 px-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-white hover:bg-slate-800",
                pathname === item.href && "bg-slate-800"
              )}
            >
              <item.icon className="mr-2 h-5 w-5" />
              {item.name}
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col">
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
          <SheetContent side="left" className="p-0 bg-slate-900">
            {SidebarContent}
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
} 