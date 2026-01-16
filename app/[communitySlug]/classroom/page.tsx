"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import CourseCard from "@/components/CourseCard";
import CreateCourseModal from "@/components/CreateCourseModal";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface Community {
  id: string;
  name: string;
  created_by: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  slug: string;
  community_id: string;
  is_public: boolean;
}

export default function ClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const communitySlug = params?.communitySlug as string;
  const { user: currentUser, loading: isAuthLoading } = useAuth();

  const [error, setError] = useState<Error | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [membershipChecked, setMembershipChecked] = useState(false);
  const [profile, setProfile] = useState<{ is_admin: boolean } | null>(null);

  // Use SWR for community data
  const { data: community, error: communityError, isLoading: isCommunityLoading } = useSWR(
    membershipChecked ? `community:${communitySlug}` : null,
    fetcher
  );

  // Use SWR for courses data
  const { data: courses = [], mutate: mutateCourses, isLoading: isCoursesLoading } = useSWR(
    membershipChecked && community?.id
      ? `courses:${community.id}${!isCreator && !profile?.is_admin ? ':public' : ''}`
      : null,
    fetcher
  );

  // Check membership first
  useEffect(() => {
    async function checkMembership() {
      // Wait for auth to be initialized
      if (isAuthLoading) return;

      // Only redirect if user is definitely not logged in
      if (!isAuthLoading && !currentUser) {
        router.replace(`/${communitySlug}/about`);
        return;
      }

      try {
        // First check if user is admin via API
        const profileResponse = await fetch(`/api/profile?userId=${currentUser?.id}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
        }

        // Get community data via API
        const communityResponse = await fetch(`/api/community/${communitySlug}`);
        if (!communityResponse.ok) {
          throw new Error("Community not found");
        }
        const communityData = await communityResponse.json();

        // Admins have access to all communities
        if (profile?.is_admin) {
          setMembershipChecked(true);
          setIsMember(true);
          return;
        }

        // Check if user is creator
        if (communityData.created_by === currentUser?.id) {
          setMembershipChecked(true);
          setIsMember(true);
          setIsCreator(true);
          return;
        }

        // Check if user is a member via API
        const memberResponse = await fetch(`/api/community/${communitySlug}/check-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?.id }),
        });

        setMembershipChecked(true);

        if (memberResponse.ok) {
          const memberData = await memberResponse.json();
          if (!memberData.hasSubscription) {
            router.replace(`/${communitySlug}/about`);
            return;
          }
          setIsMember(true);
        } else {
          router.replace(`/${communitySlug}/about`);
        }
      } catch (error) {
        console.error("Error checking membership:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
        setMembershipChecked(true);
      }
    }

    checkMembership();
  }, [communitySlug, currentUser, isAuthLoading]);

  const handleCreateCourse = async (newCourse: any) => {
    try {
      const formData = new FormData();
      formData.append("title", newCourse.title);
      formData.append("description", newCourse.description);
      formData.append("image", newCourse.image as File);
      formData.append("is_public", "false");

      const response = await fetch(`/api/community/${communitySlug}/courses`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create course");
      }

      const createdCourse = await response.json();
      mutateCourses([...courses, createdCourse], false); // Update the courses list optimistically
      setIsCreateCourseModalOpen(false);
      toast.success("Course created successfully");
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course");
      mutateCourses(); // Revalidate the courses list if the optimistic update failed
    }
  };

  // Show loading state while checking membership
  if (isAuthLoading || !membershipChecked) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If we're not a member, don't show anything while redirecting
  if (!isMember) {
    return null;
  }

  // Show loading state for data fetching if we're confirmed as a member
  if (isCommunityLoading || isCoursesLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <CommunityNavbar 
          communitySlug={communitySlug} 
          activePage="classroom" 
          isMember={isMember} 
        />
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
              <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
              {isCreator && (
                <div className="h-9 w-28 bg-gray-200 rounded animate-pulse"></div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4 h-64 animate-pulse">
                  <div className="w-full h-40 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state if any error occurred
  if (error || communityError) {
    return <div>Error loading classroom: {(error || communityError)?.message}</div>;
  }

  // Only show loading state for data fetching if we're confirmed as a member
  if (!community) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <CommunityNavbar 
        communitySlug={communitySlug} 
        activePage="classroom" 
        isMember={isMember} 
      />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Classroom</h1>
            {isCreator && (
              <Button onClick={() => setIsCreateCourseModalOpen(true)}>
                Create Course
              </Button>
            )}
          </div>

          <div>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map((course: Course) => (
                  <Link
                    key={course.id}
                    href={`/${communitySlug}/classroom/${course.slug}`}
                  >
                    <CourseCard
                      course={course}
                      onClick={() => {}}
                    />
                    {(isCreator || profile?.is_admin) && !course.is_public && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-gray-500 rounded-full"></span>
                        Private Course
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                {isCreator ? (
                  <p className="text-xl text-gray-600">
                    You don't have a course yet, click on the Create Course button to create your first course
                  </p>
                ) : (
                  <p className="text-xl text-gray-600">
                    This community doesn't have any public courses yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <CreateCourseModal
          isOpen={isCreateCourseModalOpen}
          onClose={() => setIsCreateCourseModalOpen(false)}
          onCreateCourse={handleCreateCourse}
          communityId={community.id}
        />
      </main>
    </div>
  );
}
