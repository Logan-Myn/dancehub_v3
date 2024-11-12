"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Course } from "@/types/course";
import { toast } from "react-toastify";
import { getAuth, User, onAuthStateChanged } from 'firebase/auth';

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
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [isAddingLesson, setIsAddingLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [community, setCommunity] = useState<Community | null>(null);
  const [isEditingCourse, setIsEditingCourse] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;

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
        const response = await fetch(`/api/community/${communitySlug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch community data');
        }
        const communityData = await response.json();
        console.log('Fetched community data:', communityData); // Debug log
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
  }, [communitySlug, courseSlug, router, authLoading]);

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
      "Are you sure you want to delete this chapter and all its lessons? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete chapter");
      }

      setChapters((prevChapters) =>
        prevChapters.filter((chapter) => chapter.id !== chapterId)
      );

      // If the deleted chapter had the selected lesson, clear the selection
      if (selectedLesson && chapters.find(c => c.id === chapterId)?.lessons.find(l => l.id === selectedLesson.id)) {
        setSelectedLesson(null);
      }

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
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}/lessons/${lessonId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

      // If the deleted lesson was selected, clear the selection
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null);
      }

      toast.success("Lesson deleted successfully");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };

  const handleEditCourse = () => {
    setIsEditMode(!isEditMode);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  const isCreator = Boolean(user?.uid && community?.createdBy && user.uid === community.createdBy);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="classroom" />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            {isCreator && user && community && (
              <Button 
                onClick={handleEditCourse}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Course
              </Button>
            )}
          </div>
          <div className="flex">
            {/* Left section: Course index */}
            <div className="w-1/4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Course Content</h2>
              </div>

              {chapters.map((chapter) => (
                <div key={chapter.id} className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">{chapter.title}</h3>
                    {isCreator && isEditMode && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setIsAddingLesson(chapter.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {isAddingLesson === chapter.id && (
                    <div className="ml-4 mb-2 p-2 bg-gray-50 rounded-md">
                      <Input
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Lesson title"
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleAddLesson(chapter.id)}
                          size="sm"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setIsAddingLesson(null);
                            setNewLessonTitle("");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <ul className="ml-4">
                    {chapter.lessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className="flex justify-between items-center py-1"
                      >
                        <span
                          className={`cursor-pointer ${
                            selectedLesson?.id === lesson.id
                              ? "text-blue-500"
                              : "text-gray-700"
                          }`}
                          onClick={() => setSelectedLesson(lesson)}
                        >
                          {lesson.title}
                        </span>
                        {isCreator && isEditMode && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleDeleteLesson(chapter.id, lesson.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {isCreator && isEditMode && (
                <div className="mt-6">
                  {isAddingChapter ? (
                    <div className="p-2 bg-gray-50 rounded-md">
                      <Input
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="Chapter title"
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleAddChapter} size="sm">Save</Button>
                        <Button 
                          onClick={() => {
                            setIsAddingChapter(false);
                            setNewChapterTitle("");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsAddingChapter(true)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Chapter
                    </Button>
                  )}
                </div>
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
