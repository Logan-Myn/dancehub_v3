"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Play, FileText, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/auth";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import type { Course } from "@/types/course";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableItem } from "@/components/DraggableItem";
import { Card } from "@/components/ui/card";
import VideoUpload from "@/components/VideoUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MuxPlayer } from "@/components/MuxPlayer";

interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
  order?: number;
  position?: number;
  chapter_position?: number;
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl?: string;
  videoAssetId?: string | null;
  playbackId?: string | null;
  completed?: boolean;
  order?: number;
  position?: number;
  lesson_position?: number;
  chapter_id: string;
}

interface Community {
  id: string;
  name: string;
  created_by: string;
}

const VideoPlayer = ({ url }: { url: string }) => {
  return (
    <div className="relative pb-[56.25%] h-0">
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        src={url}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

interface AddLessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (lessonData: {
    title: string;
    content: string;
    videoAssetId?: string;
  }) => void;
  chapterId: string;
}

function AddLessonDialog({
  isOpen,
  onClose,
  onSubmit,
  chapterId,
}: AddLessonDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoAssetId, setVideoAssetId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({ title, content, videoAssetId });
      setTitle("");
      setContent("");
      setVideoAssetId(undefined);
      onClose();
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Lesson Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter lesson title"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Video Content (Optional)
            </label>
            <VideoUpload
              onUploadComplete={(assetId) => {
                setVideoAssetId(assetId);
                toast.success("Video uploaded successfully");
              }}
              onUploadError={(error) => toast.error(error)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Lesson Content
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter lesson content"
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Lesson"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add this new component for lesson editing
interface LessonEditorProps {
  lesson: Lesson;
  onSave: (lessonData: {
    content: string;
    videoAssetId?: string;
  }) => Promise<void>;
  isCreator: boolean;
}

function LessonEditor({ lesson, onSave, isCreator }: LessonEditorProps) {
  const [content, setContent] = useState(lesson.content || '');
  const [videoAssetId, setVideoAssetId] = useState<string | undefined>(
    lesson.videoAssetId || undefined
  );
  const [playbackId, setPlaybackId] = useState<string | undefined>(
    lesson.playbackId || undefined
  );
  const [isSaving, setIsSaving] = useState(false);

  // Add new function to handle immediate video update
  const handleVideoUpload = async (assetId: string) => {
    setVideoAssetId(assetId);
    try {
      // Save only the video update immediately
      await onSave({ content, videoAssetId: assetId });
      toast.success("Video uploaded successfully");
    } catch (error) {
      toast.error("Failed to save video");
      setVideoAssetId(undefined); // Reset if save fails
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ content, videoAssetId });
      toast.success("Lesson content updated successfully");
    } catch (error) {
      toast.error("Failed to update lesson");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isCreator && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Video Content</h3>
            <VideoUpload
              onUploadComplete={(playbackId) => {
                setPlaybackId(playbackId);
                handleVideoUpload(playbackId);
              }}
              onUploadError={(error) => toast.error(error)}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Lesson Content</h3>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full"
              placeholder="Enter lesson content..."
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isSaving ? "Saving..." : "Save Content"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Add type for VideoUpload props
interface VideoUploadProps {
  onUploadComplete: (assetId: string) => void;
  onUploadError: (error: string) => void;
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

  const { user } = useAuth();
  const supabase = createClient();

  const [isEditMode, setIsEditMode] = useState(false);

  const [expandedChapters, setExpandedChapters] = useState<{
    [key: string]: boolean;
  }>({});

  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!communitySlug || !courseSlug) {
      console.error("Missing slugs:", { communitySlug, courseSlug });
      router.push("/");
      return;
    }

    async function fetchCourse() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Fetching course:", {
          communitySlug,
          courseSlug,
          hasSession: !!session,
        });

        const response = await fetch(
          `/api/community/${communitySlug}/courses/${courseSlug}`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            cache: 'no-store',
            next: { revalidate: 0 }
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Course fetch failed:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
          throw new Error(`Failed to fetch course: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const courseData = await response.json();
        console.log("Course data received:", {
          id: courseData.id,
          title: courseData.title,
          chaptersCount: courseData.chapters?.length,
        });

        if (!courseData.id) {
          console.error("Invalid course data received:", courseData);
          throw new Error("Invalid course data received");
        }

        // Process chapters and lessons
        console.log('Raw course data:', courseData);
        
        // Just use the data directly from the API without transformations
        setCourse(courseData);
        setChapters(courseData.chapters || []);

        // Set initial selected lesson
        if (courseData.chapters?.length > 0) {
          const firstChapter = courseData.chapters[0];
          if (firstChapter.lessons?.length > 0) {
            setSelectedLesson(firstChapter.lessons[0]);
          }
        }

      } catch (error) {
        console.error("Error in fetchCourse:", error);
        toast.error("Failed to load course data");
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchCommunity() {
      try {
        const { data: community, error } = await supabase
          .from('communities')
          .select('*')
          .eq('slug', communitySlug)
          .single();

        if (error) throw error;
        setCommunity(community);
      } catch (error) {
        console.error("Error fetching community data:", error);
        toast.error("Failed to load community data");
      }
    }

    if (communitySlug && courseSlug) {
      fetchCourse();
      fetchCommunity();
    }
  }, [communitySlug, courseSlug, router, refreshTrigger]);

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

  // Replace the AddLessonDialog with inline lesson creation
  const handleAddLesson = async (chapterId: string, title: string) => {
    if (!title.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}/lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ title }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add lesson");
      }

      const newLesson = await response.json();

      // Update chapters state with the new lesson
      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId
            ? {
                ...chapter,
                lessons: [...chapter.lessons, newLesson],
              }
            : chapter
        )
      );

      // Clear form and close dialog
      setNewLessonTitle("");
      setIsAddingLesson(null);

      // Select the new lesson
      setSelectedLesson(newLesson);
      toast.success("Lesson added successfully");
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast.error("Failed to add lesson");
    }
  };

  // Add this new function to handle lesson updates
  const handleUpdateLesson = async (lessonData: {
    content: string;
    videoAssetId?: string;
  }) => {
    if (!selectedLesson) return;

    const currentChapter = chapters.find((chapter) =>
      chapter.lessons.some((lesson) => lesson.id === selectedLesson.id)
    );
    if (!currentChapter) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${currentChapter.id}/lessons/${selectedLesson.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            title: selectedLesson.title,
            content: lessonData.content,
            videoAssetId: lessonData.videoAssetId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update lesson");
      }

      const updatedLesson = await response.json();

      // Update the chapters state with the new lesson data
      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === currentChapter.id
            ? {
                ...chapter,
                lessons: chapter.lessons.map((lesson) =>
                  lesson.id === selectedLesson.id ? updatedLesson : lesson
                ),
              }
            : chapter
        )
      );

      // Update the selected lesson
      setSelectedLesson(updatedLesson);
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast.error("Failed to update lesson");
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

  const handleDeleteChapter = async (chapterId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this chapter and all its lessons? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
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
      if (
        selectedLesson &&
        chapters
          .find((c) => c.id === chapterId)
          ?.lessons.find((l) => l.id === selectedLesson.id)
      ) {
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}/lessons/${lessonId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
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

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const isProcessingRef = useRef(false);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        updateChaptersOrder(newOrder);

        return newOrder;
      });
    }
  };

  const handleLessonDragEnd = async (chapterId: string, event: any) => {
    const { active, over } = event;

    if (active.id !== over.id && !isProcessingRef.current) {
      isProcessingRef.current = true;
      
      try {
        const chapter = chapters.find(c => c.id === chapterId);
        if (!chapter) return;

        const lessons = [...chapter.lessons];
        const oldIndex = lessons.findIndex(lesson => lesson.id === active.id);
        const newIndex = lessons.findIndex(lesson => lesson.id === over.id);

        // Only update if indices are different
        if (oldIndex === newIndex) return;

        // Move the lesson to its new position
        const [movedLesson] = lessons.splice(oldIndex, 1);
        lessons.splice(newIndex, 0, movedLesson);

        // Update positions based on new order
        const newLessons = lessons.map((lesson, index) => ({
          ...lesson,
          lesson_position: index
        }));

        // Update UI state immediately with the new order
        setChapters(prevChapters => 
          prevChapters.map(c => 
            c.id === chapterId 
              ? { ...c, lessons: newLessons }
              : c
          )
        );

        // Make the API call
        await updateLessonsOrder(chapterId, newLessons);
        
        // Force a refresh of the data from the server
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error in handleLessonDragEnd:', error);
        toast.error('Failed to update lesson order');
        // On error, force a refresh to get back to the server state
        setRefreshTrigger(prev => prev + 1);
      } finally {
        isProcessingRef.current = false;
      }
    }
  };

  const updateChaptersOrder = async (chapters: Chapter[]) => {
    if (!isCreator || !isEditMode || isSavingOrder) return;

    try {
      setIsSavingOrder(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/reorder`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chapters }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update chapters order");
      }

      toast.success("Order updated", {
        duration: 2000,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Error updating chapters order:", error);
      toast.error("Failed to update order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const updateLessonsOrder = async (chapterId: string, lessons: Lesson[]) => {
    if (!isCreator || !isEditMode || isSavingOrder) return;

    try {
      setIsSavingOrder(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `/api/community/${communitySlug}/courses/${courseSlug}/chapters/${chapterId}/lessons/reorder`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lessons }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Reorder API error:', errorText);
        throw new Error("Failed to update lessons order");
      }

      const updatedLessons = await response.json();
      console.log('Received updated lessons from API:', updatedLessons);

      // Force a fresh fetch of the course data
      setRefreshTrigger(prev => prev + 1);

      toast.success("Order updated", {
        duration: 2000,
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Error updating lessons order:", error);
      toast.error("Failed to update order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const renderLessonContent = (): JSX.Element => {
    if (!selectedLesson) {
      return (
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-gray-500">Select a lesson to begin</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Lesson Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              {selectedLesson.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {selectedLesson.videoAssetId && (
                <div className="flex items-center gap-1">
                  <Play className="w-4 h-4" />
                  <span>Video lesson</span>
                </div>
              )}
              {selectedLesson.content && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>Reading material</span>
                </div>
              )}
            </div>
          </div>
          {selectedLesson.completed && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span>Completed</span>
            </div>
          )}
        </div>

        {/* Video Content */}
        {(selectedLesson.playbackId || selectedLesson.videoAssetId) && (
          <Card className="p-4">
            <MuxPlayer playbackId={selectedLesson.playbackId || selectedLesson.videoAssetId!} />
          </Card>
        )}

        {/* Text Content */}
        {selectedLesson.content && (
          <Card className="p-6 prose prose-slate max-w-none">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: selectedLesson.content || ''
              }}
            />
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              // Find previous lesson logic
              const currentChapter = chapters.find((chapter) =>
                chapter.lessons.some(
                  (lesson) => lesson.id === selectedLesson.id
                )
              );
              if (!currentChapter) return;

              const currentLessonIndex = currentChapter.lessons.findIndex(
                (lesson) => lesson.id === selectedLesson.id
              );

              if (currentLessonIndex > 0) {
                // Previous lesson in same chapter
                setSelectedLesson(
                  currentChapter.lessons[currentLessonIndex - 1]
                );
              } else {
                // Go to last lesson of previous chapter
                const currentChapterIndex = chapters.findIndex(
                  (chapter) => chapter.id === currentChapter.id
                );
                if (currentChapterIndex > 0) {
                  const previousChapter = chapters[currentChapterIndex - 1];
                  setSelectedLesson(
                    previousChapter.lessons[previousChapter.lessons.length - 1]
                  );
                }
              }
            }}
            disabled={selectedLesson.id === chapters[0]?.lessons[0]?.id}
          >
            Previous Lesson
          </Button>
          <Button
            onClick={() => {
              // Find next lesson logic
              const currentChapter = chapters.find((chapter) =>
                chapter.lessons.some(
                  (lesson) => lesson.id === selectedLesson.id
                )
              );
              if (!currentChapter) return;

              const currentLessonIndex = currentChapter.lessons.findIndex(
                (lesson) => lesson.id === selectedLesson.id
              );

              if (currentLessonIndex < currentChapter.lessons.length - 1) {
                // Next lesson in same chapter
                setSelectedLesson(
                  currentChapter.lessons[currentLessonIndex + 1]
                );
              } else {
                // Go to first lesson of next chapter
                const currentChapterIndex = chapters.findIndex(
                  (chapter) => chapter.id === currentChapter.id
                );
                if (currentChapterIndex < chapters.length - 1) {
                  const nextChapter = chapters[currentChapterIndex + 1];
                  setSelectedLesson(nextChapter.lessons[0]);
                }
              }
            }}
            disabled={
              selectedLesson.id ===
              chapters[chapters.length - 1]?.lessons[
                chapters[chapters.length - 1]?.lessons.length - 1
              ]?.id
            }
          >
            Next Lesson
          </Button>
        </div>

        {isCreator && isEditMode ? (
          <LessonEditor
            lesson={selectedLesson}
            onSave={handleUpdateLesson}
            isCreator={isCreator}
          />
        ) : (
          <div>{/* ... existing video and content display ... */}</div>
        )}
      </div>
    );
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

  const isCreator = Boolean(
    user?.id && community?.created_by && user.id === community.created_by
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar initialUser={user} />
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
                {isEditMode ? "Done Editing" : "Edit Course"}
              </Button>
            )}
          </div>
          <div className="flex">
            {/* Left section: Course index */}
            <div className="w-1/4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Course Content</h2>
              </div>

              {isCreator && isEditMode ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={chapters.map((chapter) => chapter.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {chapters.map((chapter) => (
                      <div key={chapter.id} className="mb-4">
                        <DraggableItem id={chapter.id}>
                          <div className="flex-1">
                            <div
                              className="flex justify-between items-center mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                              onClick={() => toggleChapter(chapter.id)}
                            >
                              <h3 className="text-lg font-medium">
                                {chapter.title}
                              </h3>
                              <div className="flex items-center gap-2">
                                {isCreator && isEditMode && (
                                  <div
                                    className="flex gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      onClick={() =>
                                        setIsAddingLesson(chapter.id)
                                      }
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        handleDeleteChapter(chapter.id)
                                      }
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                                {expandedChapters[chapter.id] ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                            </div>

                            {expandedChapters[chapter.id] && (
                              <>
                                {isAddingLesson === chapter.id && (
                                  <div className="ml-6 mb-2 p-2 bg-gray-50 rounded-md">
                                    <Input
                                      value={newLessonTitle}
                                      onChange={(e) =>
                                        setNewLessonTitle(e.target.value)
                                      }
                                      placeholder="Lesson title"
                                      className="mb-2"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() =>
                                          handleAddLesson(
                                            chapter.id,
                                            newLessonTitle
                                          )
                                        }
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

                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={(event) =>
                                    handleLessonDragEnd(chapter.id, event)
                                  }
                                >
                                  <SortableContext
                                    items={(chapter.lessons || []).map(
                                      (lesson) => lesson.id
                                    )}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <ul className="ml-6 space-y-1">
                                      {(chapter.lessons || []).map((lesson) => (
                                        <DraggableItem
                                          key={lesson.id}
                                          id={lesson.id}
                                        >
                                          <li className="flex-1 flex justify-between items-center py-1 px-2 rounded-md hover:bg-gray-50">
                                            <span
                                              className={`cursor-pointer ${
                                                selectedLesson?.id === lesson.id
                                                  ? "text-blue-500"
                                                  : "text-gray-700"
                                              }`}
                                              onClick={() =>
                                                setSelectedLesson(lesson)
                                              }
                                            >
                                              {lesson.title}
                                            </span>
                                            {isCreator && isEditMode && (
                                              <Button
                                                onClick={() =>
                                                  handleDeleteLesson(
                                                    chapter.id,
                                                    lesson.id
                                                  )
                                                }
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </li>
                                        </DraggableItem>
                                      ))}
                                    </ul>
                                  </SortableContext>
                                </DndContext>
                              </>
                            )}
                          </div>
                        </DraggableItem>
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                // Regular view when not in edit mode
                chapters.map((chapter) => (
                  <div key={chapter.id} className="mb-4">
                    <div
                      className="flex justify-between items-center mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <h3 className="text-lg font-medium">{chapter.title}</h3>
                      <div className="flex items-center gap-2">
                        {isCreator && isEditMode && (
                          <div
                            className="flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                        {expandedChapters[chapter.id] ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>

                    {expandedChapters[chapter.id] && (
                      <ul className="ml-6 space-y-1">
                        {chapter.lessons.map((lesson) => (
                          <li
                            key={lesson.id}
                            className="flex justify-between items-center py-1 px-2 rounded-md hover:bg-gray-50"
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
                                  onClick={() =>
                                    handleDeleteLesson(chapter.id, lesson.id)
                                  }
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
                    )}
                  </div>
                ))
              )}

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
                        <Button onClick={handleAddChapter} size="sm">
                          Save
                        </Button>
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
            <div className="w-3/4 pl-8">
              <div className="bg-white rounded-lg shadow-sm p-8">
                {renderLessonContent()}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
