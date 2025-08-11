"use client";

import { useEffect, useRef, useState } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  PhoneOff, 
  Settings,
  MessageCircle,
  Users,
  Clock
} from "lucide-react";
import { toast } from "react-hot-toast";

interface VideoCallProps {
  roomUrl: string;
  token: string;
  bookingId: string;
  userName?: string;
  isTeacher?: boolean;
  lessonTitle: string;
  duration: number; // in minutes
  onCallEnd?: () => void;
  onCallStart?: () => void;
}

export default function VideoCall({
  roomUrl,
  token,
  bookingId,
  userName = "User",
  isTeacher = false,
  lessonTitle,
  duration,
  onCallEnd,
  onCallStart,
}: VideoCallProps) {
  const callFrameRef = useRef<HTMLDivElement>(null);
  const dailyRef = useRef<DailyCall | null>(null);
  
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [localAudio, setLocalAudio] = useState(true);
  const [localVideo, setLocalVideo] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStartTime && isJoined) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        setElapsedTime(diff);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStartTime, isJoined]);

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isJoined) setShowControls(false);
    }, 5000);

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      setTimeout(() => {
        if (isJoined) setShowControls(false);
      }, 5000);
    };

    if (isJoined) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isJoined]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const joinCall = async () => {
    if (!callFrameRef.current) return;

    setIsLoading(true);

    try {
      // Create Daily instance
      const daily = DailyIframe.createFrame(callFrameRef.current, {
        iframeStyle: {
          position: 'relative',
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '12px',
        },
        showLeaveButton: false,
        showFullscreenButton: false,
        showLocalVideo: true,
        showParticipantsBar: false,
        activeSpeakerMode: true,
      });

      dailyRef.current = daily;

      // Set up event listeners
      daily.on('joined-meeting', async (event) => {
        console.log('Joined meeting:', event);
        setIsJoined(true);
        setCallStartTime(new Date());
        onCallStart?.();
        toast.success('Successfully joined the lesson!');
        
        // Track join time in the database
        try {
          const updateField = isTeacher ? 'teacher_joined_at' : 'student_joined_at';
          await fetch(`/api/bookings/${bookingId}/track-session`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              action: 'join',
              field: updateField
            })
          });
        } catch (error) {
          console.error('Error tracking join:', error);
        }
      });

      daily.on('participant-joined', (event) => {
        console.log('Participant joined:', event);
        setParticipants(prev => [...prev, event.participant]);
      });

      daily.on('participant-left', (event) => {
        console.log('Participant left:', event);
        setParticipants(prev => prev.filter(p => p.session_id !== event.participant.session_id));
      });

      daily.on('left-meeting', async () => {
        console.log('Left meeting');
        setIsJoined(false);
        setCallStartTime(null);
        setElapsedTime(0);
        onCallEnd?.();
        
        // Track leave time in the database
        try {
          const updateField = isTeacher ? 'teacher_joined_at' : 'student_joined_at';
          await fetch(`/api/bookings/${bookingId}/track-session`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              action: 'leave',
              field: updateField
            })
          });
        } catch (error) {
          console.error('Error tracking leave:', error);
        }
      });

      daily.on('error', (event) => {
        console.error('Daily error:', event);
        toast.error('Video call error: ' + event.errorMsg);
      });

      daily.on('camera-error', (event) => {
        console.error('Camera error:', event);
        toast.error('Camera access error. Please check your permissions.');
      });

      daily.on('recording-started', () => {
        toast.success('Recording started');
      });

      daily.on('recording-stopped', () => {
        toast.success('Recording stopped');
      });

      // Join the meeting
      await daily.join({
        url: roomUrl,
        token: token,
        userName: userName,
      });

    } catch (error) {
      console.error('Error joining call:', error);
      toast.error('Failed to join the video call');
      setIsLoading(false);
    }
  };

  const leaveCall = async () => {
    if (dailyRef.current) {
      await dailyRef.current.leave();
      await dailyRef.current.destroy();
      dailyRef.current = null;
    }
  };

  const toggleAudio = async () => {
    if (dailyRef.current) {
      const newAudioState = !localAudio;
      await dailyRef.current.setLocalAudio(newAudioState);
      setLocalAudio(newAudioState);
    }
  };

  const toggleVideo = async () => {
    if (dailyRef.current) {
      const newVideoState = !localVideo;
      await dailyRef.current.setLocalVideo(newVideoState);
      setLocalVideo(newVideoState);
    }
  };

  const toggleScreenShare = async () => {
    if (dailyRef.current) {
      try {
        if (isScreenSharing) {
          await dailyRef.current.stopScreenShare();
          setIsScreenSharing(false);
        } else {
          await dailyRef.current.startScreenShare();
          setIsScreenSharing(true);
        }
      } catch (error) {
        console.error('Screen share error:', error);
        toast.error('Screen sharing failed');
      }
    }
  };

  const startRecording = async () => {
    if (dailyRef.current && isTeacher) {
      try {
        await dailyRef.current.startRecording();
        toast.success('Recording started');
      } catch (error) {
        console.error('Recording error:', error);
        toast.error('Failed to start recording');
      }
    }
  };

  const stopRecording = async () => {
    if (dailyRef.current && isTeacher) {
      try {
        await dailyRef.current.stopRecording();
        toast.success('Recording stopped');
      } catch (error) {
        console.error('Recording error:', error);
        toast.error('Failed to stop recording');
      }
    }
  };

  if (!isJoined) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {lessonTitle}
          </CardTitle>
          <CardDescription>
            Duration: {duration} minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Ready to join your private lesson?
            </p>
            <Button 
              onClick={joinCall} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Joining...' : 'Join Video Lesson'}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>Make sure your camera and microphone are working</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Video container */}
      <div ref={callFrameRef} className="w-full h-full" />
      
      {/* Header overlay */}
      <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-center text-white">
          <div>
            <h3 className="font-semibold">{lessonTitle}</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(elapsedTime)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {participants.length + 1}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isTeacher && (
              <Badge variant="secondary" className="bg-blue-600 text-white">
                Teacher
              </Badge>
            )}
            <Badge variant="outline" className="border-white/30 text-white">
              Live
            </Badge>
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-center items-center gap-2">
          {/* Audio toggle */}
          <Button
            variant={localAudio ? "secondary" : "destructive"}
            size="sm"
            onClick={toggleAudio}
            className="rounded-full w-10 h-10 p-0"
          >
            {localAudio ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          {/* Video toggle */}
          <Button
            variant={localVideo ? "secondary" : "destructive"}
            size="sm"
            onClick={toggleVideo}
            className="rounded-full w-10 h-10 p-0"
          >
            {localVideo ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>

          {/* Screen share */}
          <Button
            variant={isScreenSharing ? "default" : "secondary"}
            size="sm"
            onClick={toggleScreenShare}
            className="rounded-full w-10 h-10 p-0"
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </Button>

          {/* Recording (teacher only) */}
          {isTeacher && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={startRecording}
                className="rounded-full w-10 h-10 p-0"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={stopRecording}
                className="rounded-full w-10 h-10 p-0"
              >
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
              </Button>
            </>
          )}

          {/* Leave call */}
          <Button
            variant="destructive"
            size="sm"
            onClick={leaveCall}
            className="rounded-full w-10 h-10 p-0"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Click to show controls hint */}
      {!showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <p className="text-white/70 text-sm">Move mouse to show controls</p>
        </div>
      )}
    </div>
  );
}
