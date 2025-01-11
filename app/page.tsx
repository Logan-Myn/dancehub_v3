"use client";

import ClientPage from "@/app/client-page";
import Navbar from "@/app/components/Navbar";
import { useAuth } from "@/hooks/auth";

export default function Home() {
  const { user } = useAuth();
  
  return (
    <>
      <Navbar initialUser={user} />
      <ClientPage />
    </>
  );
}
