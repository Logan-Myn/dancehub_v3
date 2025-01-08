"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import CommunityNavbar from "@/components/CommunityNavbar";
import Navbar from "@/app/components/Navbar";
import CourseCard from "@/components/CourseCard";
import CreateCourseModal from "@/components/CreateCourseModal";
import Link from "next/link";

interface ClientClassroomProps {
  community: {
    id: string;
    name: string;
    createdBy: string;
  };
  initialCourses: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
    image?: File;
    slug: string;
  }[];
  communitySlug: string;
}

export default function ClientClassroom({ 
  community, 
  initialCourses,
  communitySlug 
}: ClientClassroomProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState(initialCourses);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    async function checkMembership() {
      if (user?.uid) {
        try {
          const membershipStatus = await fetch(
            `/api/community/${communitySlug}/membership/${user.uid}`
          ).then((res) => res.json());
          setIsMember(membershipStatus.isMember);
        } catch (error) {
          console.error("Error checking membership:", error);
        }
      }
    }

    checkMembership();
  }, [communitySlug, user?.uid]);

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