"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import CourseCard from "@/components/CourseCard";
import CreateCourseModal from "@/components/CreateCourseModal";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/auth";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";

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
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [membershipChecked, setMembershipChecked] = useState(false);

  // Check membership first
  useEffect(() => {
    async function checkMembership() {
      // Wait for auth to be initialized
      if (isAuthLoading) return;

      // Only redirect if user is definitely not logged in
      if (!isAuthLoading && !currentUser) {
        router.replace(`/community/${communitySlug}/about`);
        return;
      }

      try {
        const { data: communityData } = await supabase
          .from("communities")
          .select("id")
          .eq("slug", communitySlug)
          .single();

        if (!communityData) {
          throw new Error("Community not found");
          return;
        }

        // Only proceed with membership check if we have a user
        if (currentUser) {
          const { data: memberData } = await supabase
            .from("community_members")
            .select("*")
            .eq("community_id", communityData.id)
            .eq("user_id", currentUser.id)
            .maybeSingle();

          setMembershipChecked(true);

          if (!memberData) {
            router.replace(`/community/${communitySlug}/about`);
            return;
          }

          setIsMember(true);
        }
      } catch (error) {
        console.error("Error checking membership:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
        setMembershipChecked(true);
      }
    }

    checkMembership();
  }, [communitySlug, currentUser, isAuthLoading]);

  // Only fetch data after membership is confirmed
  useEffect(() => {
    if (!membershipChecked || !currentUser) return;

    async function fetchData() {
      try {
        const response = await fetch(`/api/community/${communitySlug}`);
        if (!response.ok) {
          throw new Error("Community not found");
        }
        const communityData = await response.json();

        // Check if user is creator
        const isUserCreator = currentUser?.id === communityData.created_by;

        // Get courses based on user role
        let coursesQuery = supabase
          .from("courses")
          .select(`
            id,
            title,
            description,
            image_url,
            created_at,
            updated_at,
            slug,
            community_id,
            is_public
          `)
          .eq("community_id", communityData.id)
          .order("created_at", { ascending: false });

        // If user is not the creator, only show public courses
        if (!isUserCreator) {
          coursesQuery = coursesQuery.eq("is_public", true);
        }

        const { data: coursesData, error: coursesError } = await coursesQuery;

        if (coursesError) throw coursesError;

        setCommunity(communityData);
        setCourses(coursesData || []);
        setIsCreator(isUserCreator);
      } catch (error) {
        console.error("Error:", error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [communitySlug, currentUser, membershipChecked]);

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
      setCourses((prevCourses) => [...prevCourses, createdCourse]);
      setIsCreateCourseModalOpen(false);
      toast.success("Course created successfully");
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course");
    }
  };

  if (error) {
    return <div>Error loading classroom: {error.message}</div>;
  }

  // Show loading state while either auth or data is loading
  if (isAuthLoading || isLoading || !community) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="classroom" />
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

          {isMember || isCreator ? (
            <div>
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/community/${communitySlug}/classroom/${course.slug}`}
                    >
                      <CourseCard
                        course={course}
                        onClick={() => {}}
                      />
                      {isCreator && !course.is_public && (
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
          ) : (
            <div className="text-center">
              <p className="text-xl">
                You need to be a member of this community to access the courses.
              </p>
            </div>
          )}
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
