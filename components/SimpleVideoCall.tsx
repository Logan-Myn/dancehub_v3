"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, PhoneOff } from "lucide-react";
import { toast } from "react-hot-toast";

interface SimpleVideoCallProps {
  roomUrl: string;
  token: string;
  bookingId: string;
  userName?: string;
  isTeacher?: boolean;
  lessonTitle: string;
  duration: number;
  onCallEnd?: () => void;
  onCallStart?: () => void;
}

export default function SimpleVideoCall({
  roomUrl,
  token,
  bookingId,
  userName = "User",
  isTeacher = false,
  lessonTitle,
  duration,
  onCallEnd,
  onCallStart,
}: SimpleVideoCallProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const callFrameRef = useRef<HTMLDivElement>(null);
  const dailyCallRef = useRef<any>(null);

  // Load Daily.co script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.DailyIframe) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleJoinCall = async () => {
    console.log('🎬 Starting Daily.co video call with proper SDK');
    
    if (!roomUrl || !token) {
      console.error('❌ Missing room URL or token');
      toast.error('Video session not properly configured');
      return;
    }

    if (!callFrameRef.current) {
      console.error('❌ Call frame ref not ready');
      toast.error('Video container not ready');
      return;
    }

    setIsLoading(true);

    try {
      // Wait for Daily.co script to load
      if (!window.DailyIframe) {
        toast.error('Daily.co is still loading, please try again');
        setIsLoading(false);
        return;
      }

      console.log('🔧 Creating Daily.co iframe with proper SDK');

      // Create Daily iframe using the correct method
      const callFrame = window.DailyIframe.createFrame(callFrameRef.current, {
        iframeStyle: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px'
        },
        showLeaveButton: false,
        showLocalVideo: true,
        showParticipantsBar: true,
      });

      dailyCallRef.current = callFrame;

      // Set up event listeners
      callFrame.on('joined-meeting', async () => {
        console.log('🎉 Successfully joined Daily.co meeting!');
        setIsLoading(false);
        setHasStarted(true);
        onCallStart?.();
        toast.success('Joined video call successfully!');

        // Track session start
        try {
          const userRole = isTeacher ? 'teacher' : 'student';
          await fetch('/api/video-session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, userRole })
          });
        } catch (error) {
          console.error('Error tracking session start:', error);
        }
      });

      callFrame.on('left-meeting', () => {
        console.log('👋 Left Daily.co meeting');
        setHasStarted(false);
        setIsLoading(false);
      });

      callFrame.on('error', (error: any) => {
        console.error('❌ Daily.co error:', error);
        setIsLoading(false);
        toast.error(`Video call error: ${error.errorMsg || 'Unknown error'}`);
      });

      // Join the meeting with token - THIS IS THE CORRECT WAY
      console.log('🚀 Joining Daily.co room with token');
      await callFrame.join({
        url: roomUrl,
        token: token,
        userName: userName,
      });

    } catch (error) {
      console.error('❌ Error joining Daily.co call:', error);
      setIsLoading(false);
      toast.error('Failed to join video call');
    }
  };

  const handleEndCall = async () => {
    try {
      if (dailyCallRef.current) {
        await dailyCallRef.current.leave();
        await dailyCallRef.current.destroy();
        dailyCallRef.current = null;
      }

      await fetch('/api/video-session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      
      setHasStarted(false);
      onCallEnd?.();
      toast.success('Video call ended');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  if (!hasStarted && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg p-8">
        <Video className="w-16 h-16 mb-6 opacity-80" />
        <h2 className="text-2xl font-bold mb-2">{lessonTitle}</h2>
        <p className="text-lg opacity-90 mb-6">Duration: {duration} minutes</p>
        <p className="text-base opacity-80 mb-8 text-center max-w-md">
          Ready to join your private lesson?
        </p>
        
        <Button
          onClick={handleJoinCall}
          className="bg-white text-purple-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg text-lg"
        >
          Join Video Call
        </Button>
        
        <p className="text-sm opacity-70 mt-4 text-center">
          Make sure your camera and microphone are working
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-lg">Connecting to video call...</p>
        <p className="text-sm opacity-70 mt-2">Please allow camera and microphone access</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-black rounded-lg overflow-hidden">
      {/* Daily.co Video Container */}
      <div 
        ref={callFrameRef} 
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
      
      {/* End Call Button */}
      {hasStarted && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            onClick={handleEndCall}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </Button>
        </div>
      )}
    </div>
  );
}

// Extend window type to include DailyIframe
declare global {
  interface Window {
    DailyIframe: any;
  }
}