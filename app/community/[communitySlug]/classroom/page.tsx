"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
}

export default function ClassroomPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user: currentUser } = useAuth();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get community data
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("*")
          .eq("slug", communitySlug)
          .single();

        if (communityError || !communityData) {
          throw new Error("Community not found");
        }

        // Get courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(`
            id,
            title,
            description,
            image_url,
            created_at,
            updated_at,
            slug,
            community_id
          `)
          .eq("community_id", communityData.id)
          .order("created_at", { ascending: false });

        if (coursesError) throw coursesError;

        // Check membership if user is logged in
        let membershipStatus = false;
        if (currentUser) {
          const { data: memberData, error: memberError } = await supabase
            .from("community_members")
            .select("id")
            .eq("community_id", communityData.id)
            .eq("user_id", currentUser.id)
            .maybeSingle();

          if (memberError) {
            console.error("Error checking membership:", memberError);
          }

          membershipStatus = !!memberData;
        }

        setCommunity(communityData);
        setCourses(coursesData || []);
        setIsMember(membershipStatus);
        setIsCreator(currentUser?.id === communityData.created_by);
      } catch (error) {
        console.error("Error:", error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    if (communitySlug) {
      fetchData();
    }
  }, [communitySlug, currentUser]);

  const handleCreateCourse = async (newCourse: any) => {
    try {
      const formData = new FormData();
      formData.append("title", newCourse.title);
      formData.append("description", newCourse.description);
      formData.append("image", newCourse.image as File);

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

  if (isLoading || !community) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
                        onClick={() => {}} // Empty onClick to satisfy prop requirement
                      />
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
                      This community doesn't have courses yet
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
