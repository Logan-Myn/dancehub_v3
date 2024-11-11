"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Course } from "@/types/course";
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";

interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string;
}

export default function CoursePage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const courseSlug = params?.courseSlug as string;
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchCourse() {
      try {
        // Fetch course data
        const courseData = await fetch(`/api/community/${communitySlug}/courses/${courseSlug}`).then((res) => res.json());
        
        if (courseData.error) {
          // If course is not found, redirect to the classroom page
          router.push(`/community/${communitySlug}/classroom`);
        } else {
          setCourse(courseData);
          setChapters(courseData.chapters || []);
          setSelectedLesson(courseData.chapters?.[0]?.lessons?.[0] || null);
        }
      } catch (error) {
        console.error("Error fetching course data:", error);
        toast.error("Failed to load course data");
      } finally {
        setIsLoading(false);
      }
    }

    if (communitySlug && courseSlug) {
      fetchCourse();
    }
  }, [communitySlug, courseSlug, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="classroom" />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex">
            {/* Left section: Course index */}
            <div className="w-1/4">
              <h2 className="text-xl font-semibold mb-4">Course Content</h2>
              {chapters.map((chapter) => (
                <div key={chapter.id} className="mb-4">
                  <h3 className="text-lg font-medium mb-2">{chapter.title}</h3>
                  <ul className="ml-4">
                    {chapter.lessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className={`cursor-pointer py-1 ${
                          selectedLesson?.id === lesson.id ? 'text-blue-500' : 'text-gray-700'
                        }`}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        {lesson.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Center/right section: Course content */}
            <div className="w-3/4">
              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: selectedLesson?.content || '' }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 