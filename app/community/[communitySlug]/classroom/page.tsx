import { Suspense } from "react";
import { getCommunityData } from "@/lib/firebase-admin";
import ClientClassroom from "./client-page";

interface Community {
  id: string;
  name: string;
  createdBy: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  image?: File;
  slug: string;
}

async function getCourses(communitySlug: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/community/${communitySlug}/courses`, { 
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) throw new Error('Failed to fetch courses');
  return response.json();
}

export default async function ClassroomPage({ 
  params 
}: { 
  params: { communitySlug: string } 
}) {
  const communitySlug = params.communitySlug;
  const communityData = await getCommunityData(communitySlug);
  const courses = await getCourses(communitySlug);

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <ClientClassroom 
        community={communityData}
        initialCourses={courses}
        communitySlug={communitySlug}
      />
    </Suspense>
  );
}
