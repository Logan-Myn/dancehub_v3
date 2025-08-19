"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Clock, X, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase';

interface TimeSlot {
  id?: string;
  start_time: string;
  end_time: string;
}

interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

interface TeacherCalendarAvailabilityProps {
  communitySlug: string;
  availability: DayAvailability[];
  onAvailabilityUpdate: (availability: DayAvailability[]) => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  return { value: time, label: displayTime };
});

export default function TeacherCalendarAvailability({ 
  communitySlug, 
  availability, 
  onAvailabilityUpdate 
}: TeacherCalendarAvailabilityProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({ start_time: '', end_time: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Get the first day of the month and calculate calendar grid
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startCalendar = new Date(firstDayOfMonth);
  startCalendar.setDate(startCalendar.getDate() - firstDayOfMonth.getDay());

  const calendarDays = [];
  const current = new Date(startCalendar);
  
  for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
    calendarDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const formatDate = (date: Date) => {
    // Use local timezone to avoid date shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateString = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayAvailability = (date: Date): DayAvailability | undefined => {
    const dateStr = formatDate(date);
    return availability.find(av => av.date === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    if (isPastDate(date)) return;
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    setIsDialogOpen(true);
  };

  const handleAddSlot = async () => {
    if (!selectedDate || !newSlot.start_time || !newSlot.end_time) {
      toast.error('Please fill all fields');
      return;
    }

    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    setIsLoading(true);
    try {
      // Get user session for authentication
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const response = await fetch(`/api/community/${communitySlug}/teacher-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: selectedDate,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add availability slot');
      }

      const addedSlot = await response.json();
      
      // Update local state
      const existingDay = availability.find(av => av.date === selectedDate);
      if (existingDay) {
        existingDay.slots.push(addedSlot);
      } else {
        availability.push({
          date: selectedDate,
          slots: [addedSlot]
        });
      }
      
      onAvailabilityUpdate([...availability]);
      
      // Reset form
      setNewSlot({ start_time: '', end_time: '' });
      toast.success('Availability slot added successfully');
    } catch (error) {
      console.error('Error adding availability slot:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add availability slot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to remove this availability slot?')) {
      return;
    }

    setIsLoading(true);
    try {
      // Get user session for authentication
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const response = await fetch(
        `/api/community/${communitySlug}/teacher-availability?slotId=${slotId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete availability slot');
      }

      // Update local state
      const updatedAvailability = availability.map(day => ({
        ...day,
        slots: day.slots.filter(slot => slot.id !== slotId)
      })).filter(day => day.slots.length > 0);

      onAvailabilityUpdate(updatedAvailability);
      toast.success('Availability slot removed successfully');
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove availability slot');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDayAvailability = selectedDate ? getDayAvailability(new Date(selectedDate)) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Teaching Availability Calendar
        </h3>
        <div className="text-sm text-gray-600">
          Click on dates to set your availability
        </div>
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const dayAvailability = getDayAvailability(date);
              const hasAvailability = dayAvailability && dayAvailability.slots.length > 0;
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);
              const isPast = isPastDate(date);

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`
                    relative min-h-[80px] p-1 border rounded-lg cursor-pointer transition-all
                    ${!isCurrentMonthDay ? 'text-gray-400 bg-gray-50' : ''}
                    ${isPast ? 'cursor-not-allowed opacity-50' : ''}
                    ${isTodayDate ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    ${hasAvailability ? 'bg-green-50 border-green-200' : ''}
                    ${!isPast && isCurrentMonthDay ? 'hover:bg-blue-50 hover:border-blue-300' : ''}
                  `}
                >
                  <div className="text-sm font-medium">
                    {date.getDate()}
                  </div>
                  
                  {hasAvailability && (
                    <div className="mt-1 space-y-1">
                      {dayAvailability.slots.slice(0, 2).map((slot, slotIndex) => (
                        <div key={slotIndex} className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded truncate">
                          {formatTime(slot.start_time)}
                        </div>
                      ))}
                      {dayAvailability.slots.length > 2 && (
                        <div className="text-xs text-green-600 font-medium">
                          +{dayAvailability.slots.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Availability Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Set Availability for {selectedDate && formatDateString(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add New Slot Form */}
            <div className="space-y-4">
              <h4 className="font-medium">Add Time Slot</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <select
                    id="start-time"
                    value={newSlot.start_time}
                    onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select start time</option>
                    {TIME_OPTIONS.map(time => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <select
                    id="end-time"
                    value={newSlot.end_time}
                    onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select end time</option>
                    {TIME_OPTIONS.map(time => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={handleAddSlot} disabled={isLoading} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? 'Adding...' : 'Add Time Slot'}
              </Button>
            </div>

            {/* Current Slots */}
            {selectedDayAvailability && selectedDayAvailability.slots.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Current Time Slots</h4>
                <div className="space-y-2">
                  {selectedDayAvailability.slots.map((slot, index) => (
                    <div key={slot.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                      {slot.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot.id!)}
                          disabled={isLoading}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
