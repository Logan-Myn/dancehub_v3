"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TeacherCalendarAvailability from './TeacherCalendarAvailability';
import CreatePrivateLessonModal from './CreatePrivateLessonModal';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Loader2, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PrivateLessonManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communitySlug: string;
}

type TabType = 'details' | 'schedule';

export default function PrivateLessonManagementModal({
  isOpen,
  onClose,
  communityId,
  communitySlug,
}: PrivateLessonManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const { user } = useAuth();
  const supabase = createClient();

  // Private lessons state
  const [privateLessons, setPrivateLessons] = useState<any[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // Lesson bookings state
  const [lessonBookings, setLessonBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Teacher availability state
  const [teacherAvailability, setTeacherAvailability] = useState<{date: string, slots: any[]}[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  // Utility functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch private lessons
  useEffect(() => {
    async function fetchPrivateLessons() {
      if (isOpen) {
        setIsLoadingLessons(true);
        try {
          const response = await fetch(`/api/community/${communitySlug}/private-lessons`);
          if (!response.ok) throw new Error("Failed to fetch private lessons");
          const data = await response.json();
          setPrivateLessons(data.lessons || []);
        } catch (error) {
          console.error("Error fetching private lessons:", error);
          toast.error("Failed to load private lessons");
        } finally {
          setIsLoadingLessons(false);
        }
      }
    }

    fetchPrivateLessons();
  }, [communitySlug, isOpen]);

  // Fetch lesson bookings
  useEffect(() => {
    async function fetchLessonBookings() {
      if (isOpen) {
        setIsLoadingBookings(true);
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('Session error:', sessionError);
            return;
          }

          if (!session?.access_token) {
            console.error('No access token available');
            return;
          }

          const response = await fetch(`/api/community/${communitySlug}/lesson-bookings`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch lesson bookings: ${response.status}`);
          }

          const data = await response.json();
          setLessonBookings(data.bookings || []);
        } catch (error) {
          console.error("Error fetching lesson bookings:", error);
          toast.error("Failed to load lesson bookings");
        } finally {
          setIsLoadingBookings(false);
        }
      }
    }

    fetchLessonBookings();
  }, [communitySlug, isOpen, supabase.auth]);

  // Handle lesson status toggle
  const handleToggleLessonStatus = async (lessonId: string, currentStatus: boolean) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/community/${communitySlug}/private-lessons/${lessonId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update lesson status');

      // Update local state
      setPrivateLessons(prev => prev.map(lesson => 
        lesson.id === lessonId 
          ? { ...lesson, is_active: !currentStatus }
          : lesson
      ));
      
      toast.success(`Lesson ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling lesson status:', error);
      toast.error('Failed to update lesson status');
    }
  };

  // Handle lesson deletion
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/community/${communitySlug}/private-lessons/${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete lesson');

      // Remove from local state
      setPrivateLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      toast.success('Private lesson deleted successfully');
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Failed to delete lesson');
    }
  };

  // Handle video session join
  const handleJoinVideoSession = async (booking: any) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/bookings/${booking.id}/video-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to get video token');

      const { token, room_url } = await response.json();
      window.open(`/video-session/${booking.id}?token=${token}`, '_blank');
    } catch (error) {
      console.error('Error joining video session:', error);
      toast.error('Failed to join video session');
    }
  };

  // Handle edit lesson
  const handleEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setIsEditModalOpen(true);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    // Refetch private lessons to update the list
    const refetchLessons = async () => {
      setIsLoadingLessons(true);
      try {
        const response = await fetch(`/api/community/${communitySlug}/private-lessons`);
        if (!response.ok) throw new Error("Failed to fetch private lessons");
        const data = await response.json();
        setPrivateLessons(data.lessons || []);
      } catch (error) {
        console.error("Error fetching private lessons:", error);
        toast.error("Failed to refresh lessons");
      } finally {
        setIsLoadingLessons(false);
      }
    };
    
    refetchLessons();
    setIsEditModalOpen(false);
    setEditingLesson(null);
  };

  const renderDetailsTab = () => (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Lessons</h3>
            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">{Array.isArray(privateLessons) ? privateLessons.length : 0}</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Active Lessons</h3>
            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">
            {(Array.isArray(privateLessons) ? privateLessons.filter(lesson => lesson.is_active) : []).length}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
            <UserGroupIcon className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">{Array.isArray(lessonBookings) ? lessonBookings.length : 0}</p>
        </Card>
      </div>

      {/* Private Lessons List */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Your Private Lessons</h3>
        </div>

        {isLoadingLessons ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : !Array.isArray(privateLessons) || privateLessons.length === 0 ? (
          <div className="text-center py-8">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No private lessons</h3>
            <p className="mt-1 text-sm text-gray-500">
              Go to the Private Lessons page to create your first lesson.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.isArray(privateLessons) ? privateLessons.map((lesson) => (
              <Card key={lesson.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{lesson.title}</h4>
                      <Badge
                        variant={lesson.is_active ? "default" : "secondary"}
                      >
                        {lesson.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{lesson.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <p className="font-medium">{lesson.duration_minutes} min</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Regular Price:</span>
                        <p className="font-medium">{formatPrice(lesson.regular_price)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Member Price:</span>
                        <p className="font-medium">
                          {lesson.member_price ? formatPrice(lesson.member_price) : 'Same as regular'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <p className="font-medium capitalize">{lesson.location_type.replace('_', ' ')}</p>
                      </div>
                    </div>

                    {lesson.requirements && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Requirements:</strong> {lesson.requirements}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditLesson(lesson)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleLessonStatus(lesson.id, lesson.is_active)}
                    >
                      {lesson.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            )) : []}
          </div>
        )}
      </div>

      {/* Lesson Bookings */}
      <div>
        <h3 className="text-lg font-medium mb-4">Lesson Bookings & Sessions</h3>
        
        {isLoadingBookings ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : !Array.isArray(lessonBookings) || lessonBookings.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Bookings will appear here when students book your private lessons.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.isArray(lessonBookings) ? lessonBookings.map((booking) => (
              <Card key={booking.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{booking.lesson_title}</h4>
                      <Badge
                        variant={booking.payment_status === 'succeeded' ? "default" : 
                                booking.payment_status === 'pending' ? "secondary" : "destructive"}
                      >
                        {booking.payment_status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Student:</span>
                        <p className="font-medium">{booking.student_name || booking.student_email}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Price Paid:</span>
                        <p className="font-medium">{formatPrice(booking.price_paid)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Booked:</span>
                        <p className="font-medium">{formatDate(booking.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Scheduled:</span>
                        <p className="font-medium">{booking.scheduled_at ? formatDateTime(booking.scheduled_at) : 'TBD'}</p>
                      </div>
                    </div>

                    {booking.student_message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <strong>Student Message:</strong> {booking.student_message}
                        </p>
                      </div>
                    )}

                    {booking.contact_info && (
                      <div className="mt-2 text-sm text-gray-600">
                        {booking.contact_info.phone && (
                          <p><strong>Phone:</strong> {booking.contact_info.phone}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {booking.payment_status === 'succeeded' && booking.scheduled_at && (
                      <Button
                        onClick={() => handleJoinVideoSession(booking)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        Join Video Session
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (booking.student_email) {
                          window.location.href = `mailto:${booking.student_email}`;
                        }
                      }}
                    >
                      Contact Student
                    </Button>
                  </div>
                </div>
              </Card>
            )) : []}
          </div>
        )}
      </div>
    </div>
  );

  const renderScheduleTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Teacher Availability</h3>
        <TeacherCalendarAvailability
          communitySlug={communitySlug}
          availability={teacherAvailability}
          onAvailabilityUpdate={setTeacherAvailability}
        />
      </div>
    </div>
  );

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
                  >
                    Manage Private Lessons
                  </Dialog.Title>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="rounded-full"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </Button>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'details'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'schedule'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Schedule
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="max-h-[600px] overflow-y-auto">
                  {activeTab === 'details' && renderDetailsTab()}
                  {activeTab === 'schedule' && renderScheduleTab()}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
      
      {/* Edit Private Lesson Modal */}
      <CreatePrivateLessonModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLesson(null);
        }}
        communitySlug={communitySlug}
        onSuccess={handleEditSuccess}
        editingLesson={editingLesson}
      />
    </Transition>
  );
}