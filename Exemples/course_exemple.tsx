"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCommunityBySlug,
  getCourseBySlug,
  updateChapter,
  updateLesson,
  deleteLessonFromChapter,
  addChapterToCourse,
  addLessonToChapter,
  deleteChapter,
  Course,
  Lesson,
  Chapter,
  updateLessonCompletion,
} from "@/lib/db";
import { useParams } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, Plus, Edit2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MuxUploader from "@mux/mux-uploader-react";
import MuxPlayer from "@mux/mux-player-react";
import EditCourseModal from '@/app/components/EditCourseModal';
import { useRouter } from 'next/navigation';
import CommunityNavbar from "@/app/components/CommunityNavbar";
import toast from 'react-hot-toast';

interface LessonWithCompletion extends Lesson {
  completed: boolean;
}

interface ChapterWithCompletionLessons extends Chapter {
  lessons: LessonWithCompletion[];
}

interface CourseWithCompletionChapters extends Course {
  chapters: ChapterWithCompletionLessons[];
}

export default function CoursePage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const courseSlug = params?.courseSlug as string;
  
  const { user } = useAuth();
  const [community, setCommunity] = useState<any>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [editingLessonContent, setEditingLessonContent] = useState<string>("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState<string>("");
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();
  const [courseWithCompletion, setCourseWithCompletion] = useState<CourseWithCompletionChapters | null>(null);
  const [billingInfo, setBillingInfo] = useState({
    currentPlan: '',
    monthlyFee: 0,
    nextBillingDate: '',
    billingCycle: '',
    paymentHistory: []
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const communityData = await getCommunityBySlug(communitySlug);
        if (communityData) {
          const courseData = await getCourseBySlug(
            communityData.id,
            courseSlug
          );
          console.log("Fetched course data:", courseData);
          setCommunity(communityData);
          setCourse(courseData);
          setLoading(false);
          if (courseData) {
            setIsCreator(user?.uid === courseData.createdBy);
            if (
              courseData.chapters &&
              courseData.chapters.length > 0 &&
              courseData.chapters[0].lessons &&
              courseData.chapters[0].lessons.length > 0
            ) {
              setSelectedLesson(courseData.chapters[0].lessons[0]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load course data. Please try again.");
        setLoading(false);
      }
    }
    if (!loading) {
      fetchData();
    }
  }, [communitySlug, courseSlug, user?.uid, loading]);

  useEffect(() => {
    if (course) {
      const courseWithCompletionData: CourseWithCompletionChapters = {
        ...course,
        chapters: course.chapters.map(chapter => ({
          ...chapter,
          lessons: chapter.lessons.map(lesson => ({
            ...lesson,
            completed: lesson.completed || false // Use the completion status from the database if available
          }))
        }))
      };
      setCourseWithCompletion(courseWithCompletionData);
      setProgress(calculateProgress()); // Calculate initial progress
    }
  }, [course]);

  const calculateProgress = useCallback(() => {
    if (!courseWithCompletion) return 0;
    const totalLessons = courseWithCompletion.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
    const completedLessons = courseWithCompletion.chapters.reduce((sum, chapter) => 
      sum + chapter.lessons.filter(lesson => lesson.completed).length, 0);
    return Math.round((completedLessons / totalLessons) * 100);
  }, [courseWithCompletion]);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(calculateProgress());
  }, [calculateProgress]);

  const handleUploadRequest = useCallback(async () => {
    try {
      const response = await fetch("/api/upload-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, uploadId } = await response.json();
      setUploadUrl(uploadUrl);
      setUploadId(uploadId);
      return uploadUrl;
    } catch (error) {
      console.error("Error getting upload URL:", error);
      return null;
    }
  }, []);

  const handleUploadSuccess = useCallback(
    async (evt: CustomEvent<any>) => {
      console.log("Upload success event:", evt);

      if (!selectedLesson || !isCreator) {
        console.log("Early return conditions:", {
          selectedLesson: !!selectedLesson,
          isCreator,
        });
        return;
      }

      try {
        const response = await fetch(
          `/api/check-asset-status?uploadId=${uploadId}`
        );
        if (!response.ok) throw new Error("Failed to fetch asset details");
        const asset = await response.json();
        console.log("Fetched asset details:", asset);

        if (asset && asset.playback_ids && asset.playback_ids.length > 0) {
          const playbackId = asset.playback_ids[0].id;
          console.log("Playback ID:", playbackId);

          const chapter = course?.chapters.find((c) =>
            c.lessons.some((l) => l.id === selectedLesson.id)
          );
          if (chapter) {
            await updateLesson(
              communitySlug,
              courseSlug,
              chapter.id,
              selectedLesson.id,
              { videoUrl: playbackId }
            );
            setCourse((prevCourse) => {
              if (!prevCourse) return null;
              const updatedCourse = {
                ...prevCourse,
                chapters: prevCourse.chapters.map((c) =>
                  c.id === chapter.id
                    ? {
                        ...c,
                        lessons: c.lessons.map((l) =>
                          l.id === selectedLesson.id
                            ? { ...l, videoUrl: playbackId }
                            : l
                        ),
                      }
                    : c
                ),
              };
              console.log("Updated course:", updatedCourse);
              return updatedCourse;
            });
            setSelectedLesson((prevLesson) => {
              const updatedLesson = { ...prevLesson!, videoUrl: playbackId };
              console.log("Updated selected lesson:", updatedLesson);
              return updatedLesson;
            });
          }
        }
      } catch (error) {
        console.error("Error processing upload success:", error);
      } finally {
        setUploadUrl(null);
        setUploadId(null);
      }
    },
    [
      selectedLesson,
      isCreator,
      course,
      communitySlug,
      courseSlug,
      updateLesson,
      uploadId,
    ]
  );

  const handleAddChapter = async () => {
    if (!isCreator) return;
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: "New Chapter",
      lessons: [],
    };
    const newChapterId = await addChapterToCourse(
      communitySlug,
      courseSlug,
      newChapter
    );
    setCourse((prevCourse) => {
      if (!prevCourse) return null;
      return {
        ...prevCourse,
        chapters: [...prevCourse.chapters, { ...newChapter, id: newChapterId }],
      };
    });
    setEditingItemId(newChapterId);
    setEditingItemTitle("New Chapter");
  };

  const handleAddLesson = async (chapterId: string) => {
    if (!isCreator) return;
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: "New Lesson",
      videoUrl: "",
      content: "",
      completed: false
    };
    const newLessonId = await addLessonToChapter(
      communitySlug,
      courseSlug,
      chapterId,
      newLesson
    );
    setCourse((prevCourse) => {
      if (!prevCourse) return null;
      return {
        ...prevCourse,
        chapters: prevCourse.chapters.map((chapter) =>
          chapter.id === chapterId
            ? {
                ...chapter,
                lessons: [
                  ...chapter.lessons,
                  { ...newLesson, id: newLessonId },
                ],
              }
            : chapter
        ),
      };
    });
    setEditingItemId(newLessonId);
    setEditingItemTitle("New Lesson");
  };

  const handleStartEditing = (id: string, title: string) => {
    setEditingItemId(id);
    setEditingItemTitle(title);
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !course) return;

    const chapter = course.chapters.find((c) => c.id === editingItemId);
    if (chapter) {
      await updateChapter(communitySlug, courseSlug, editingItemId, {
        title: editingItemTitle,
      });
      setCourse((prevCourse) => ({
        ...prevCourse!,
        chapters: prevCourse!.chapters.map((c) =>
          c.id === editingItemId ? { ...c, title: editingItemTitle } : c
        ),
      }));
    } else {
      const lessonChapter = course.chapters.find((c) =>
        c.lessons.some((l) => l.id === editingItemId)
      );
      if (lessonChapter) {
        await updateLesson(
          communitySlug,
          courseSlug,
          lessonChapter.id,
          editingItemId,
          { title: editingItemTitle }
        );
        setCourse((prevCourse) => ({
          ...prevCourse!,
          chapters: prevCourse!.chapters.map((c) =>
            c.id === lessonChapter.id
              ? {
                  ...c,
                  lessons: c.lessons.map((l) =>
                    l.id === editingItemId ? { ...l, title: editingItemTitle } : l
                  ),
                }
              : c
          ),
        }));
      }
    }
    setEditingItemId(null);
    setEditingItemTitle("");
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!isCreator || !course) return;
    try {
      await deleteChapter(communitySlug, courseSlug, chapterId);
      setCourse((prevCourse) => ({
        ...prevCourse!,
        chapters: prevCourse!.chapters.filter((c) => c.id !== chapterId),
      }));
    } catch (error) {
      console.error("Error deleting chapter:", error);
    }
  };

  const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
    if (!isCreator) return;
    try {
      await deleteLessonFromChapter(
        communitySlug,
        courseSlug,
        chapterId,
        lessonId
      );
      setCourse((prevCourse) => {
        if (!prevCourse) return null;
        return {
          ...prevCourse,
          chapters: prevCourse.chapters.map((chapter) =>
            chapter.id === chapterId
              ? {
                  ...chapter,
                  lessons: chapter.lessons.filter(
                    (lesson) => lesson.id !== lessonId
                  ),
                }
              : chapter
          ),
        };
      });
      if (selectedLesson && selectedLesson.id === lessonId) {
        setSelectedLesson(null);
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
    }
  };

  const handleLessonContentSave = async () => {
    if (selectedLesson) {
      const chapter = course!.chapters.find((c) =>
        c.lessons.some((l) => l.id === selectedLesson.id)
      );
      if (chapter) {
        await updateLesson(
          communitySlug,
          courseSlug,
          chapter.id,
          selectedLesson.id,
          { content: editingLessonContent }
        );
        setCourse((prevCourse) => ({
          ...prevCourse!,
          chapters: prevCourse!.chapters.map((c) =>
            c.id === chapter.id
              ? {
                  ...c,
                  lessons: c.lessons.map((l) =>
                    l.id === selectedLesson.id
                      ? { ...l, content: editingLessonContent }
                      : l
                  ),
                }
              : c
          ),
        }));
        setSelectedLesson((prevLesson) => ({
          ...prevLesson!,
          content: editingLessonContent,
        }));
      }
    }
  };

  const handleCourseUpdate = (updatedCourse: Course) => {
    setCourse(updatedCourse);
  };

  const handleCourseDelete = () => {
    router.push(`/community/${communitySlug}/classroom`);
  };

  const handleLessonCompletion = async (chapterId: string, lessonId: string, completed: boolean) => {
    try {
      if (!course || !community) {
        throw new Error("Course or community not found");
      }

      await updateLessonCompletion(
        community.id,
        course.id,
        chapterId,
        lessonId,
        completed
      );

      setCourseWithCompletion(prevCourse => {
        if (!prevCourse) return null;
        const updatedCourse = {
          ...prevCourse,
          chapters: prevCourse.chapters.map(chapter => 
            chapter.id === chapterId ? {
              ...chapter,
              lessons: chapter.lessons.map(lesson => 
                lesson.id === lessonId ? { ...lesson, completed } : lesson
              )
            } : chapter
          )
        };
        // Update the selectedLesson if it's the one being completed
        if (selectedLesson && selectedLesson.id === lessonId) {
          setSelectedLesson(prevLesson => ({ ...prevLesson!, completed }));
        }
        return updatedCourse;
      });

      // Recalculate progress after updating
      setProgress(calculateProgress());
    } catch (error) {
      console.error("Error updating lesson completion:", error);
      // Optionally, show an error message to the user
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!community || !course) return <div>No data available</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <CommunityNavbar 
        communitySlug={communitySlug}
        activePage="classroom"
      />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            {isCreator && (
              <Button 
                onClick={() => setIsEditModalOpen(true)} 
                className="bg-black hover:bg-gray-800 text-white"
              >
                Edit Course Details
              </Button>
            )}
          </div>
          <div className="flex space-x-8">
            {/* Left sidebar */}
            <div className="w-1/4">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Course Content</h2>
                <div className="mb-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-gray-500 mt-2">{progress}% Complete</p>
                </div>
                {courseWithCompletion?.chapters.map((chapter, index) => (
                  <div key={chapter.id} className="mb-4">
                    {editingItemId === chapter.id ? (
                      <Input
                        value={editingItemTitle}
                        onChange={(e) => setEditingItemTitle(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                        className="mb-2"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">
                          Chapter {index + 1}: {chapter.title}
                        </h3>
                        {isCreator && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditing(chapter.id, chapter.title)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                    <ul className="space-y-2">
                      {chapter.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <Button
                            variant="ghost"
                            className={`text-left w-full ${
                              selectedLesson?.id === lesson.id
                                ? "bg-gray-200"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            {lesson.title}
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {isCreator && (
                      <Button
                        variant="ghost"
                        className="w-full text-left text-black pl-6 mt-2"
                        onClick={() => handleAddLesson(chapter.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Lesson
                      </Button>
                    )}
                  </div>
                ))}
                {isCreator && (
                  <Button
                    onClick={handleAddChapter}
                    className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Chapter
                  </Button>
                )}
              </div>
            </div>

            {/* Main content area */}
            <div className="w-3/4">
              {selectedLesson ? (
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">{selectedLesson.title}</h2>
                    <button
                      onClick={() => {
                        const chapter = courseWithCompletion?.chapters.find(c => 
                          c.lessons.some(l => l.id === selectedLesson.id)
                        );
                        if (chapter) {
                          handleLessonCompletion(
                            chapter.id,
                            selectedLesson.id,
                            !selectedLesson.completed
                          );
                        }
                      }}
                      className={`p-1 rounded-full ${
                        selectedLesson.completed ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <Check className={`w-5 h-5 ${
                        selectedLesson.completed ? 'text-white' : 'text-gray-400'
                      }`} />
                    </button>
                  </div>
                  {isCreator && !selectedLesson.videoUrl ? (
                    <MuxUploader
                      endpoint={handleUploadRequest}
                      onSuccess={handleUploadSuccess}
                      onError={(err) => console.error("Upload error:", err)}
                    />
                  ) : null}
                  {selectedLesson.videoUrl && (
                    <div className="mb-4">
                      <MuxPlayer
                        streamType="on-demand"
                        playbackId={selectedLesson.videoUrl}
                        metadata={{
                          video_id: selectedLesson.id,
                          video_title: selectedLesson.title,
                        }}
                        onError={(err: any) => console.error("MuxPlayer error:", err)}
                        onPlaying={() => console.log("MuxPlayer is playing")}
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-2">Lesson Content</h3>
                    {isCreator ? (
                      <>
                        <Textarea
                          value={editingLessonContent || selectedLesson.content}
                          onChange={(e) => setEditingLessonContent(e.target.value)}
                          className="w-full mb-2"
                          rows={10}
                        />
                        <Button onClick={handleLessonContentSave} className="bg-black hover:bg-gray-800 text-white">Save Content</Button>
                      </>
                    ) : (
                      <div className="prose max-w-none">{selectedLesson.content}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                  <h2 className="text-2xl font-bold mb-4">Welcome to {course.title}</h2>
                  <p className="text-gray-600">Select a lesson from the sidebar to start learning.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
          © 2024 DanceHub. All rights reserved.
        </div>
      </footer>

      {isCreator && course && (
        <EditCourseModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          course={course}
          communitySlug={communitySlug}
          onCourseUpdate={handleCourseUpdate}
          onCourseDelete={handleCourseDelete}
        />
      )}
    </div>
  );
}

function NavItem({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-${active ? 'gray-900 font-semibold' : 'gray-500 hover:text-gray-900'}`}
    >
      {children}
    </Link>
  );
}
