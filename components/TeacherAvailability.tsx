import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TeacherAvailabilitySlot } from '@/types/private-lessons';
import { createClient } from '@/lib/supabase';

interface TeacherAvailabilityProps {
  communitySlug: string;
  slots: TeacherAvailabilitySlot[];
  onSlotsUpdate: (slots: TeacherAvailabilitySlot[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  return { value: time, label: displayTime };
});

export default function TeacherAvailability({ 
  communitySlug, 
  slots, 
  onSlotsUpdate 
}: TeacherAvailabilityProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: '',
    start_time: '',
    end_time: ''
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayName = (dayOfWeek: number) => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
    return day ? day.label : 'Unknown';
  };

    const handleAddSlot = async () => {
    if (!newSlot.day_of_week || !newSlot.start_time || !newSlot.end_time) {
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
          day_of_week: parseInt(newSlot.day_of_week),
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add availability slot');
      }

      const addedSlot = await response.json();
      onSlotsUpdate([...slots, addedSlot]);
      
      // Reset form
      setNewSlot({
        day_of_week: '',
        start_time: '',
        end_time: ''
      });

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

      onSlotsUpdate(slots.filter(slot => slot.id !== slotId));
      toast.success('Availability slot removed successfully');
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove availability slot');
    } finally {
      setIsLoading(false);
    }
  };

  // Group slots by day for better display
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, TeacherAvailabilitySlot[]>);

  // Sort slots within each day by start time
  Object.keys(slotsByDay).forEach(day => {
    slotsByDay[parseInt(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Teaching Availability</h3>
          <p className="text-sm text-gray-500">
            Set your available time slots for private lessons
          </p>
        </div>
      </div>

      {/* Add New Slot Form */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Add New Availability Slot</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="day">Day of Week</Label>
            <Select
              value={newSlot.day_of_week}
              onValueChange={(value) => setNewSlot(prev => ({ ...prev, day_of_week: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start-time">Start Time</Label>
            <Select
              value={newSlot.start_time}
              onValueChange={(value) => setNewSlot(prev => ({ ...prev, start_time: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Start time" />
              </SelectTrigger>
              <SelectContent className="max-h-48 overflow-y-auto">
                {TIME_SLOTS.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="end-time">End Time</Label>
            <Select
              value={newSlot.end_time}
              onValueChange={(value) => setNewSlot(prev => ({ ...prev, end_time: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="End time" />
              </SelectTrigger>
              <SelectContent className="max-h-48 overflow-y-auto">
                {TIME_SLOTS.filter(time => !newSlot.start_time || time.value > newSlot.start_time).map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleAddSlot} 
          disabled={isLoading || !newSlot.day_of_week || !newSlot.start_time || !newSlot.end_time}
          className="mt-4 w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Availability Slot
        </Button>
      </Card>

      {/* Current Availability */}
      <div>
        <h4 className="font-medium mb-4">Your Current Availability</h4>
        {slots.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No availability set</h3>
            <p className="text-gray-500 mb-4">
              Students will only be able to book private lessons during your available time slots.
            </p>
            <p className="text-sm text-gray-400">
              Add your first availability slot above to get started.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const daySlots = slotsByDay[day.value] || [];
              if (daySlots.length === 0) return null;

              return (
                <Card key={day.value} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">{day.label}</h5>
                    <span className="text-sm text-gray-500">
                      {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {slots.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">How it works</h4>
              <p className="text-sm text-blue-700 mt-1">
                Students can only book private lessons during your available time slots. 
                Make sure to keep your availability updated to receive more bookings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
