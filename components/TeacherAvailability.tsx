import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TeacherAvailabilitySlot } from '@/types/private-lessons';
import { createClient } from '@/lib/supabase';

interface TeacherAvailabilityProps {
  communitySlug: string;
  slots: TeacherAvailabilitySlot[];
  onSlotsUpdate: (slots: TeacherAvailabilitySlot[]) => void;
}


export default function TeacherAvailability({ 
  communitySlug, 
  slots, 
  onSlotsUpdate 
}: TeacherAvailabilityProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: '',
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


    const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) {
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
          date: newSlot.date,
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
        date: '',
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

  // Group slots by date for better display
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.availability_date]) {
      acc[slot.availability_date] = [];
    }
    acc[slot.availability_date].push(slot);
    return acc;
  }, {} as Record<string, TeacherAvailabilitySlot[]>);

  // Sort slots within each date by start time
  Object.keys(slotsByDate).forEach(date => {
    slotsByDate[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

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
            <Label htmlFor="date">Date</Label>
            <Input
              type="date"
              id="date"
              value={newSlot.date}
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
              onChange={(e) => setNewSlot(prev => ({ ...prev, date: e.target.value }))}
              placeholder="Select date"
            />
          </div>

          <div>
            <Label htmlFor="start-time">Start Time</Label>
            <Input
              type="time"
              id="start-time"
              value={newSlot.start_time}
              onChange={(e) => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
              placeholder="Start time"
            />
          </div>

          <div>
            <Label htmlFor="end-time">End Time</Label>
            <Input
              type="time"
              id="end-time"
              value={newSlot.end_time}
              onChange={(e) => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
              placeholder="End time"
            />
          </div>
        </div>

        <Button 
          onClick={handleAddSlot} 
          disabled={isLoading || !newSlot.date || !newSlot.start_time || !newSlot.end_time}
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
            {Object.keys(slotsByDate)
              .sort() // Sort dates chronologically
              .map((date) => {
                const dateSlots = slotsByDate[date] || [];
                if (dateSlots.length === 0) return null;

                return (
                  <Card key={date} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900">{formatDate(date)}</h5>
                      <span className="text-sm text-gray-500">
                        {dateSlots.length} slot{dateSlots.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dateSlots.map((slot) => (
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
