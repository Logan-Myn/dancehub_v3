"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import CourseCard from "@/components/CourseCard";
import CreateCourseModal from "@/components/CreateCourseModal";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

interface ClientClassroomProps {
  community: {
    id: string;
    name: string;
    created_by: string;
  };
  initialCourses: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    created_at: string;
    updated_at: string;
    slug: string;
    community_id: string;
  }[];
  communitySlug: string;
  currentUser: User | null;
  initialIsMember: boolean;
  isCreator: boolean;
}

export default function ClientClassroom({
  community,
  initialCourses,
  communitySlug,
  currentUser,
  initialIsMember,
  isCreator,
}: ClientClassroomProps) {
  const [courses, setCourses] = useState(initialCourses);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isMember] = useState(initialIsMember);

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

  return (
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

      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onCreateCourse={handleCreateCourse}
        communityId={community.id}
      />
    </main>
  );
}
