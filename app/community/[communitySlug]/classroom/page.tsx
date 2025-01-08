"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import CommunityNavbar from "@/components/CommunityNavbar";
import Navbar from "@/app/components/Navbar";
import CourseCard from "@/components/CourseCard";
import CreateCourseModal from "@/components/CreateCourseModal";
import Link from "next/link";
import { slugify } from "@/lib/utils";

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

export default function ClassroomPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    async function fetchCommunityAndCourses() {
      try {
        // Fetch community data
        const communityData = await fetch(
          `/api/community/${communitySlug}`
        ).then((res) => res.json());
        setCommunity(communityData);

        // Check if user is a member of the community
        if (user?.uid) {
          const membershipStatus = await fetch(
            `/api/community/${communitySlug}/membership/${user.uid}`
          ).then((res) => res.json());
          setIsMember(membershipStatus.isMember);
        }

        // Fetch courses data
        const coursesData = await fetch(
          `/api/community/${communitySlug}/courses`
        ).then((res) => res.json());
        setCourses(coursesData);
      } catch (error) {
        console.error("Error fetching community and courses data:", error);
        toast.error("Failed to load community and courses data");
      } finally {
        setIsLoading(false);
      }
    }

    if (communitySlug) {
      fetchCommunityAndCourses();
    }
  }, [communitySlug, user?.uid]);

  const handleCreateCourse = async (newCourse: Course) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!community) {
    return <div>Community not found</div>;
  }

  const isCreator = user?.uid === community.createdBy;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
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

          {isMember ? (
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
            <div className="text-center">
              <p className="text-xl">
                You need to be a member of this community to access the courses.
              </p>
            </div>
          )}
        </div>
      </main>

      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onCreateCourse={handleCreateCourse}
      />
    </div>
  );
}
