import { createServerClient } from "@/lib/supabase";
import { Suspense } from "react";
import ClientAboutPage from "./client-page";
import ServerNavbar from "@/components/server-navbar";
import { notFound } from "next/navigation";

async function getCommunityData(communitySlug: string) {
  const supabase = createServerClient();
  
  const { data: community, error } = await supabase
    .from("communities")
    .select("*, about_page")
    .eq("slug", communitySlug)
    .single();

  if (error) {
    console.error("Error fetching community:", error.message);
    return null;
  }

  return community;
}

export default async function AboutPage({
  params,
}: {
  params: { communitySlug: string };
}) {
  const community = await getCommunityData(params.communitySlug);

  if (!community) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <ServerNavbar />
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }>
        <ClientAboutPage community={community} />
      </Suspense>
    </div>
  );
} 