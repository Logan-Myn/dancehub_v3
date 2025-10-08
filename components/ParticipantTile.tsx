"use client";

import { useEffect, useRef } from "react";
import { useParticipant, useVideoTrack, useAudioTrack } from "@daily-co/daily-react";
import { MicrophoneIcon, VideoCameraIcon } from "@heroicons/react/24/solid";
import { MicrophoneIcon as MicrophoneOffIcon, VideoCameraSlashIcon } from "@heroicons/react/24/outline";

interface ParticipantTileProps {
  sessionId: string;
  isLocal: boolean;
}

export default function ParticipantTile({ sessionId, isLocal }: ParticipantTileProps) {
  const participant = useParticipant(sessionId);
  const videoTrack = useVideoTrack(sessionId);
  const audioTrack = useAudioTrack(sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Set up video track
  useEffect(() => {
    if (videoRef.current && videoTrack.persistentTrack) {
      videoRef.current.srcObject = new MediaStream([videoTrack.persistentTrack]);
    }
  }, [videoTrack.persistentTrack]);

  // Set up audio track (only for remote participants)
  useEffect(() => {
    if (!isLocal && audioRef.current && audioTrack.persistentTrack) {
      audioRef.current.srcObject = new MediaStream([audioTrack.persistentTrack]);
    }
  }, [audioTrack.persistentTrack, isLocal]);

  if (!participant) {
    return null;
  }

  const { user_name, audio, video } = participant;
  const isVideoOff = !video;
  const isAudioOff = !audio;

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video group">
      {/* Video element */}
      {!isVideoOff && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
        />
      )}

      {/* Audio element (remote only) */}
      {!isLocal && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {/* Placeholder when video is off */}
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {user_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <VideoCameraSlashIcon className="h-8 w-8 text-gray-400 mx-auto" />
          </div>
        </div>
      )}

      {/* Name tag and status */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate">
              {user_name || 'Guest'}
              {isLocal && ' (You)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Audio status indicator */}
            {isAudioOff ? (
              <div className="bg-red-500 rounded-full p-1">
                <MicrophoneOffIcon className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="bg-green-500 rounded-full p-1">
                <MicrophoneIcon className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speaking indicator */}
      {!isAudioOff && (
        <div className="absolute top-2 right-2">
          <div className="bg-green-500 rounded-full p-1 animate-pulse">
            <div className="h-2 w-2 bg-white rounded-full"></div>
          </div>
        </div>
      )}

      {/* Local participant indicator */}
      {isLocal && (
        <div className="absolute top-2 left-2">
          <div className="bg-blue-500 px-2 py-1 rounded text-xs text-white font-medium">
            You
          </div>
        </div>
      )}
    </div>
  );
}
