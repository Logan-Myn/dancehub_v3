"use client";

import { useState, useEffect } from "react";
import { PrivateLesson } from "@/types/private-lessons";
import PrivateLessonCard from "./PrivateLessonCard";
import LessonBookingModal from "./LessonBookingModal";
import CreatePrivateLessonModal from "./CreatePrivateLessonModal";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

interface PrivateLessonsPageProps {
  communitySlug: string;
  communityId: string;
  isCreator: boolean;
  isMember: boolean;
}

export default function PrivateLessonsPage({
  communitySlug,
  communityId,
  isCreator,
  isMember,
}: PrivateLessonsPageProps) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<PrivateLesson | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, [communitySlug]);

  const fetchLessons = async () => {
    try {
      const response = await fetch(`/api/community/${communitySlug}/private-lessons`);
      if (!response.ok) {
        throw new Error('Failed to fetch lessons');
      }
      const data = await response.json();
      setLessons(data.lessons || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Failed to load private lessons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookLesson = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedLesson(lesson);
      setIsBookingModalOpen(true);
    }
  };

  const handleBookingSuccess = () => {
    toast.success('Booking successful! The teacher will contact you soon.');
    // Optionally refresh lessons or update UI
  };

  const handleCreateSuccess = () => {
    fetchLessons(); // Refresh the lessons list
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Private Lessons
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Book one-on-one sessions with the instructor
          </p>
        </div>
        {isCreator && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Private Lesson
          </Button>
        )}
      </div>

      {/* Member discount notice */}
      {!isMember && lessons.some(lesson => lesson.member_price) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Get Member Pricing
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Join this community to unlock exclusive member discounts on private lessons.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Private Lessons Available
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {isCreator 
              ? "Create your first private lesson to start offering one-on-one sessions."
              : "The instructor hasn't added any private lessons yet. Check back later!"
            }
          </p>
          {isCreator && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Private Lesson
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <PrivateLessonCard
              key={lesson.id}
              lesson={lesson}
              communitySlug={communitySlug}
              isMember={isMember}
              onBook={handleBookLesson}
            />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedLesson && (
        <LessonBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedLesson(null);
          }}
          lesson={selectedLesson}
          communitySlug={communitySlug}
          isMember={isMember}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Create Lesson Modal */}
      <CreatePrivateLessonModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        communitySlug={communitySlug}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
} 