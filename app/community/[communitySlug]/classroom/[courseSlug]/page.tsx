"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Course } from "@/types/course";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  completed?: boolean;
}

interface Community {
  id: string;
  name: string;
  createdBy: string;
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
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [isAddingLesson, setIsAddingLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [community, setCommunity] = useState<Community | null>(null);
  const searchParams = useSearchParams();
  const [isCreator, setIsCreator] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      try {
        // Fetch course data
        const courseData = await fetch(
          `/api/community/${communitySlug}/courses/${courseSlug}`
        ).then((res) => res.json());

        if (courseData.error) {
          // If course is not found, redirect to the classroom page
          router.push(`/community/${communitySlug}/classroom`);
        } else {
          setCourse(courseData);
          setChapters(courseData.chapters || []);
          setSelectedLesson(courseData.chapters?.[0]?.lessons?.[0] || null);
          setIsCreator(user?.uid === courseData.createdBy);
        }
      } catch (error) {
        console.error("Error fetching course data:", error);
        toast.error("Failed to load course data");
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchCommunity() {
      try {
        // Fetch community data
        const communityData = await fetch(
          `/api/community/${communitySlug}`
        ).then((res) => res.json());
        setCommunity(communityData);
      } catch (error) {
        console.error("Error fetching community data:", error);
        toast.error("Failed to load community data");
      }
    }

    if (communitySlug && courseSlug) {
      fetchCourse();
      fetchCommunity();
    }
  }, [communitySlug, courseSlug, router, user?.uid]);

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;

    try {
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: newChapterTitle }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add chapter");
      }

      const newChapter = await response.json();
      setChapters((prevChapters) => [...prevChapters, newChapter]);
      setNewChapterTitle("");
      setIsAddingChapter(false);
      toast.success("Chapter added successfully");
    } catch (error) {
      console.error("Error adding chapter:", error);
      toast.error("Failed to add chapter");
    }
  };

  const handleAddLesson = async (chapterId: string) => {
    if (!newLessonTitle.trim()) return;

    try {
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}/lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: newLessonTitle, content: "" }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add lesson");
      }

      const newLesson = await response.json();
      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId
            ? { ...chapter, lessons: [...chapter.lessons, newLesson] }
            : chapter
        )
      );
      setNewLessonTitle("");
      setIsAddingLesson(null);
      toast.success("Lesson added successfully");
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast.error("Failed to add lesson");
    }
  };

  const handleEditChapter = async (chapterId: string, title: string) => {
    try {
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update chapter");
      }

      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, title } : chapter
        )
      );
      toast.success("Chapter updated successfully");
    } catch (error) {
      console.error("Error updating chapter:", error);
      toast.error("Failed to update chapter");
    }
  };

  const handleEditLesson = async (
    chapterId: string,
    lessonId: string,
    title: string,
    content: string
  ) => {
    try {
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}/lessons/${lessonId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, content }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update lesson");
      }

      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId
            ? {
                ...chapter,
                lessons: chapter.lessons.map((lesson) =>
                  lesson.id === lessonId
                    ? { ...lesson, title, content }
                    : lesson
                ),
              }
            : chapter
        )
      );
      toast.success("Lesson updated successfully");
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast.error("Failed to update lesson");
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this chapter? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete chapter");
      }

      setChapters((prevChapters) =>
        prevChapters.filter((chapter) => chapter.id !== chapterId)
      );
      toast.success("Chapter deleted successfully");
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast.error("Failed to delete chapter");
    }
  };

  const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this lesson? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}/lessons/${lessonId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete lesson");
      }

      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId
            ? {
                ...chapter,
                lessons: chapter.lessons.filter(
                  (lesson) => lesson.id !== lessonId
                ),
              }
            : chapter
        )
      );
      toast.success("Lesson deleted successfully");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };

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
          <h1 className="text-3xl font-bold mb-6">{course.title}</h1>
          <div className="flex">
            {/* Left section: Course index */}
            <div className="w-1/4">
              <h2 className="text-xl font-semibold mb-4">Course Content</h2>
              {chapters.map((chapter) => (
                <div key={chapter.id} className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium mb-2">
                      {chapter.title}
                    </h3>
                    {isEditMode && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleEditChapter(chapter.id, chapter.title)
                          }
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <ul className="ml-4">
                    {chapter.lessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className={`cursor-pointer py-1 ${
                          selectedLesson?.id === lesson.id
                            ? "text-blue-500"
                            : "text-gray-700"
                        }`}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        {lesson.title}
                        {isEditMode && (
                          <div className="flex space-x-2 mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditLesson(
                                  chapter.id,
                                  lesson.id,
                                  lesson.title,
                                  lesson.content
                                );
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(chapter.id, lesson.id);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {isEditMode && (
                    isAddingLesson === chapter.id ? (
                      <div className="ml-4 mt-2">
                        <Input
                          type="text"
                          value={newLessonTitle}
                          onChange={(e) => setNewLessonTitle(e.target.value)}
                          placeholder="Enter lesson title"
                          className="mb-2"
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleAddLesson(chapter.id)}
                            disabled={!newLessonTitle.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIsAddingLesson(null);
                              setNewLessonTitle("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full text-left text-black pl-6 mt-2"
                        onClick={() => setIsAddingLesson(chapter.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Lesson
                      </Button>
                    )
                  )}
                </div>
              ))}
              {isEditMode && (
                isAddingChapter ? (
                  <div className="mb-4">
                    <Input
                      type="text"
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="Enter chapter title"
                      className="mb-2"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleAddChapter}
                        disabled={!newChapterTitle.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsAddingChapter(false);
                          setNewChapterTitle("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsAddingChapter(true)}
                    className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Chapter
                  </Button>
                )
              )}
            </div>

            {/* Center/right section: Course content */}
            <div className="w-3/4">
              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              <div
                dangerouslySetInnerHTML={{
                  __html: selectedLesson?.content || "",
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
