"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiveClassModal from "./LiveClassModal";
import LiveClassCard from "./LiveClassCard";
import { createClient } from "@/lib/supabase/client";

interface LiveClass {
  id: string;
  title: string;
  description?: string;
  scheduled_start_time: string;
  duration_minutes: number;
  teacher_name: string;
  teacher_avatar_url?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  is_currently_active: boolean;
  is_starting_soon: boolean;
}

interface WeekCalendarProps {
  communityId: string;
  communitySlug: string;
  isTeacher: boolean;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WeekCalendar({ communityId, communitySlug, isTeacher }: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchLiveClasses();
  }, [currentWeek, communityId]);

  const fetchLiveClasses = async () => {
    try {
      setLoading(true);
      const weekStartISO = format(weekStart, 'yyyy-MM-dd');
      const weekEndISO = format(weekEnd, 'yyyy-MM-dd');
      
      // Get user session for authentication
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {};
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(
        `/api/community/${communitySlug}/live-classes?start=${weekStartISO}&end=${weekEndISO}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        setLiveClasses(data);
      }
    } catch (error) {
      console.error('Error fetching live classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const handleTimeSlotClick = (day: Date, hour: number) => {
    if (!isTeacher) return;
    
    const selectedDate = new Date(day);
    selectedDate.setHours(hour, 0, 0, 0);
    
    setSelectedDateTime(selectedDate);
    setShowCreateModal(true);
  };

  const getClassesForTimeSlot = (day: Date, hour: number) => {
    return liveClasses.filter(liveClass => {
      const classDate = parseISO(liveClass.scheduled_start_time);
      return isSameDay(classDate, day) && classDate.getHours() === hour;
    });
  };

  const handleClassCreated = () => {
    fetchLiveClasses();
    setShowCreateModal(false);
    setSelectedDateTime(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {isTeacher && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Schedule Class</span>
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b border-gray-200">
            {/* Time header */}
            <div className="p-4 text-sm font-medium text-gray-500 border-r border-gray-200">
              Time
            </div>
            
            {/* Day headers */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-4 text-sm font-medium text-gray-900 border-r border-gray-200 last:border-r-0">
                <div>{DAYS[day.getDay()]}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="divide-y divide-gray-200">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 min-h-[80px]">
                {/* Time label */}
                <div className="p-4 text-sm text-gray-500 border-r border-gray-200 flex items-center">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                </div>

                {/* Day slots */}
                {weekDays.map((day) => {
                  const classes = getClassesForTimeSlot(day, hour);
                  const isPast = new Date(day.setHours(hour)) < new Date();
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={`border-r border-gray-200 last:border-r-0 p-2 relative ${
                        isTeacher && !isPast
                          ? 'hover:bg-blue-50 cursor-pointer'
                          : isPast
                          ? 'bg-gray-50'
                          : ''
                      }`}
                      onClick={() => handleTimeSlotClick(day, hour)}
                    >
                      {classes.map((liveClass) => (
                        <LiveClassCard
                          key={liveClass.id}
                          liveClass={liveClass}
                          communitySlug={communitySlug}
                        />
                      ))}
                      
                      {/* Add class hint for teachers */}
                      {isTeacher && !isPast && classes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <PlusIcon className="h-6 w-6 text-blue-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Live Class Modal */}
      {showCreateModal && (
        <LiveClassModal
          communityId={communityId}
          communitySlug={communitySlug}
          initialDateTime={selectedDateTime}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDateTime(null);
          }}
          onClassCreated={handleClassCreated}
        />
      )}
    </div>
  );
}