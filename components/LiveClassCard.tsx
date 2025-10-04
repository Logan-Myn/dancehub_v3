"use client";

import { format, parseISO } from "date-fns";
import { PlayIcon, ClockIcon, UsersIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

interface LiveClassCardProps {
  liveClass: LiveClass;
  communitySlug: string;
}

export default function LiveClassCard({ liveClass, communitySlug }: LiveClassCardProps) {
  const startTime = parseISO(liveClass.scheduled_start_time);
  const endTime = new Date(startTime.getTime() + liveClass.duration_minutes * 60000);

  const getStatusBadge = () => {
    if (liveClass.is_currently_active) {
      return <Badge variant="destructive" className="bg-red-500">LIVE</Badge>;
    }
    if (liveClass.is_starting_soon) {
      return <Badge variant="secondary" className="bg-yellow-500 text-white">Starting Soon</Badge>;
    }
    if (liveClass.status === 'ended') {
      return <Badge variant="secondary">Ended</Badge>;
    }
    if (liveClass.status === 'cancelled') {
      return <Badge variant="secondary">Cancelled</Badge>;
    }
    return <Badge variant="outline">Scheduled</Badge>;
  };

  const canJoin = liveClass.is_currently_active || liveClass.is_starting_soon;

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow mb-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {liveClass.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {liveClass.teacher_name}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex items-center text-xs text-gray-500 space-x-3 mb-3">
        <div className="flex items-center">
          <ClockIcon className="h-3 w-3 mr-1" />
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </div>
        <div className="flex items-center">
          <UsersIcon className="h-3 w-3 mr-1" />
          {liveClass.duration_minutes}min
        </div>
      </div>

      {liveClass.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {liveClass.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {liveClass.teacher_avatar_url && (
            <img
              src={liveClass.teacher_avatar_url}
              alt={liveClass.teacher_name}
              className="h-6 w-6 rounded-full mr-2"
            />
          )}
        </div>

        {canJoin && (
          <Link href={`/live-class/${liveClass.id}`}>
            <Button
              size="sm"
              variant={liveClass.is_currently_active ? "default" : "outline"}
              className="flex items-center space-x-1"
            >
              <PlayIcon className="h-3 w-3" />
              <span>
                {liveClass.is_currently_active ? "Join Now" : "Join Soon"}
              </span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}