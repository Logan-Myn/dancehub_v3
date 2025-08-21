"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  PhoneOff, 
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
  const [hasStarted, setHasStarted] = useState(false);

  // Cleanup effect
  useEffect(() => {
    return () => {
      console.log('🧹 VideoCall component unmounting, cleaning up Daily.co frame');
      if (dailyRef.current) {
        dailyRef.current.destroy();
        dailyRef.current = null;
      }
    };
  }, []);

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
    console.log('🎬 Join call button clicked');
    console.log('📍 Call frame ref:', callFrameRef.current);
    console.log('🔗 Room URL:', roomUrl);
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    
    if (!callFrameRef.current) {
      console.error('❌ Call frame ref is null');
      toast.error('Video container not ready. Please refresh the page.');
      return;
    }

    if (!roomUrl || !token) {
      console.error('❌ Missing room URL or token');
      toast.error('Video session not properly configured. Please refresh the page.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔧 Creating Daily.co iframe...');
      
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

      console.log('✅ Daily.co frame created successfully');
      dailyRef.current = daily;

      // Set up event listeners
      daily.on('joined-meeting', async (event) => {
        console.log('🎉 Joined meeting successfully:', event);
        setIsLoading(false); // Stop the loading state
        setIsJoined(true);
        setCallStartTime(new Date());
        onCallStart?.();
        toast.success('Successfully joined the lesson!');
        
        // Track join time in the database using the correct API endpoint
        try {
          const userRole = isTeacher ? 'teacher' : 'student';
          await fetch('/api/video-session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              bookingId: bookingId,
              userRole: userRole
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
        
        // Track end session in the database
        try {
          await fetch('/api/video-session/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              bookingId: bookingId
            })
          });
        } catch (error) {
          console.error('Error tracking session end:', error);
        }
      });

      daily.on('loading', (event) => {
        console.log('📡 Daily.co loading:', event);
      });

      daily.on('loaded', (event) => {
        console.log('📡 Daily.co loaded:', event);
      });

      daily.on('joining-meeting', (event) => {
        console.log('🔄 Joining meeting in progress:', event);
      });

      daily.on('error', (event) => {
        console.error('❌ Daily error:', event);
        setIsLoading(false);
        toast.error('Video call error: ' + event.errorMsg);
      });

      daily.on('camera-error', (event) => {
        console.error('📷 Camera error:', event);
        setIsLoading(false);
        toast.error('Camera access error. Please check your permissions.');
      });

      daily.on('call-instance-destroyed', (event) => {
        console.log('🗑️ Daily call instance destroyed:', event);
        setIsLoading(false);
        setIsJoined(false);
      });

      daily.on('recording-started', () => {
        toast.success('Recording started');
      });

      daily.on('recording-stopped', () => {
        toast.success('Recording stopped');
      });

      // Join the meeting
      console.log('🚀 Attempting to join Daily.co room...');
      console.log('📋 Join parameters:', {
        url: roomUrl,
        userName: userName,
        hasToken: !!token
      });
      
      await daily.join({
        url: roomUrl,
        token: token,
        userName: userName,
      });

      console.log('✅ Daily.co join request sent successfully');

    } catch (error) {
      console.error('❌ Error joining call:', error);
      toast.error(`Failed to join the video call: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Video container - always present */}
      <div ref={callFrameRef} className="w-full h-full" />
      
      {/* Pre-join overlay */}
      {!isJoined && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          {/* Pre-join background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />
          
          {/* Join interface */}
          <div className="relative z-10 text-center text-white space-y-6 max-w-md mx-auto p-8">
            <div className="space-y-2">
              <Video className="w-16 h-16 mx-auto text-purple-400" />
              <h3 className="text-2xl font-bold">{lessonTitle}</h3>
              <p className="text-gray-300">Duration: {duration} minutes</p>
            </div>
            
            <div className="space-y-4">
              <p className="text-lg text-gray-200">
                Ready to join your private lesson?
              </p>
              
              <Button 
                onClick={joinCall} 
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Joining...
                  </div>
                ) : (
                  'Join Video Lesson'
                )}
              </Button>
            </div>
            
            <div className="text-sm text-gray-400 bg-black/20 p-3 rounded-lg">
              <p>Make sure your camera and microphone are working</p>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-4 left-4 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="absolute top-6 right-8 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
        </div>
      )}
      
      {/* Header overlay - only show when joined */}
      {isJoined && (
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
      )}

      {/* Controls overlay - only show when joined */}
      {isJoined && (
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
      )}

      {/* Click to show controls hint - only show when joined */}
      {isJoined && !showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <p className="text-white/70 text-sm">Move mouse to show controls</p>
        </div>
      )}
    </div>
  );
}
