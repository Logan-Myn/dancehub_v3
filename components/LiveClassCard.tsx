"use client";

import { format, parseISO } from "date-fns";
import { PlayIcon, ClockIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useState } from "react";

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
  const [showTooltip, setShowTooltip] = useState(false);
  const startTime = parseISO(liveClass.scheduled_start_time);
  const endTime = new Date(startTime.getTime() + liveClass.duration_minutes * 60000);

  const getBackgroundColor = () => {
    if (liveClass.is_currently_active) {
      return 'bg-red-500 hover:bg-red-600 text-white border-red-600';
    }
    if (liveClass.is_starting_soon) {
      return 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600';
    }
    if (liveClass.status === 'cancelled') {
      return 'bg-gray-300 hover:bg-gray-400 text-gray-700 border-gray-400 line-through';
    }
    return 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600';
  };

  const canJoin = liveClass.is_currently_active || liveClass.is_starting_soon;
  const linkHref = canJoin ? `/${communitySlug}/live-class/${liveClass.id}` : '#';

  return (
    <div className="relative w-full">
      <Link
        href={linkHref}
        onClick={(e) => !canJoin && e.preventDefault()}
        className={`
          block w-full rounded-md border-l-4 px-2 py-1.5 mb-1
          transition-all duration-150 cursor-pointer
          ${getBackgroundColor()}
          ${!canJoin ? 'cursor-default' : ''}
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate leading-tight">
              {liveClass.title}
            </p>
            <p className="text-[10px] opacity-90 mt-0.5 flex items-center gap-1">
              <ClockIcon className="h-2.5 w-2.5 inline" />
              {format(startTime, 'h:mm')} - {format(endTime, 'h:mm a')}
            </p>
          </div>
          {liveClass.is_currently_active && (
            <div className="flex items-center gap-0.5 animate-pulse">
              <PlayIcon className="h-3 w-3" />
            </div>
          )}
        </div>
      </Link>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none">
          <div className="flex items-start gap-2 mb-2">
            {liveClass.teacher_avatar_url && (
              <img
                src={liveClass.teacher_avatar_url}
                alt={liveClass.teacher_name}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {liveClass.title}
              </h4>
              <p className="text-xs text-gray-600">{liveClass.teacher_name}</p>
            </div>
          </div>

          <div className="space-y-1 text-xs text-gray-700 mb-2">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3 text-gray-400" />
              <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
            </div>
            <div className="text-gray-500">
              Duration: {liveClass.duration_minutes} minutes
            </div>
          </div>

          {liveClass.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-3">
              {liveClass.description}
            </p>
          )}

          {canJoin && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-blue-600">
                {liveClass.is_currently_active ? '🔴 Click to join now' : '⏰ Starting soon - Click to join'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}