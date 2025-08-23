"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, PhoneOff } from "lucide-react";
import { toast } from "react-hot-toast";

declare global {
  interface Window {
    DailyIframe: any;
  }
}

interface DailyVideoCallProps {
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

export default function DailyVideoCall({
  roomUrl,
  token,
  bookingId,
  userName = "User",
  isTeacher = false,
  lessonTitle,
  duration,
  onCallEnd,
  onCallStart,
}: DailyVideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyLoaded, setDailyLoaded] = useState(false);

  // Load Daily.co script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.DailyIframe) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Daily.co script loaded');
        setDailyLoaded(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load Daily.co script');
        toast.error('Failed to load video components');
      };
      document.head.appendChild(script);
    } else if (window.DailyIframe) {
      setDailyLoaded(true);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callFrameRef.current) {
        console.log('🧹 Cleaning up Daily.co frame');
        callFrameRef.current.destroy().catch(console.error);
        callFrameRef.current = null;
      }
    };
  }, []);

  const joinCall = async () => {
    console.log('🎬 Attempting to join call...');
    console.log('📍 Room URL:', roomUrl);
    console.log('🔑 Token length:', token?.length || 0);
    
    if (!containerRef.current) {
      toast.error('Video container not ready');
      return;
    }

    if (!dailyLoaded || !window.DailyIframe) {
      toast.error('Video components still loading. Please try again.');
      return;
    }

    if (!roomUrl || !token) {
      toast.error('Missing room configuration');
      console.error('Missing room config:', { roomUrl, hasToken: !!token });
      return;
    }

    setIsLoading(true);

    try {
      // Destroy any existing frame
      if (callFrameRef.current) {
        await callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      // Create the Daily frame with prebuilt UI
      console.log('🔧 Creating Daily frame...');
      const callFrame = window.DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px',
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      callFrameRef.current = callFrame;

      // Set up ALL event listeners BEFORE joining
      callFrame.on('joining-meeting', () => {
        console.log('🔄 Joining meeting...');
      });

      callFrame.on('joined-meeting', async () => {
        console.log('✅ Successfully joined meeting');
        setIsJoined(true);
        setIsLoading(false);
        onCallStart?.();
        toast.success('Connected to lesson!');
        
        // Track session start
        try {
          await fetch('/api/video-session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              bookingId,
              userRole: isTeacher ? 'teacher' : 'student'
            })
          });
        } catch (error) {
          console.error('Error tracking session start:', error);
        }
      });

      callFrame.on('left-meeting', async () => {
        console.log('👋 Left meeting');
        setIsJoined(false);
        onCallEnd?.();
        
        // Track session end
        try {
          await fetch('/api/video-session/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
          });
        } catch (error) {
          console.error('Error tracking session end:', error);
        }
        
        // Destroy the frame after leaving
        if (callFrameRef.current) {
          callFrameRef.current.destroy();
          callFrameRef.current = null;
        }
      });

      callFrame.on('error', (error: any) => {
        console.error('❌ Daily error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setIsLoading(false);
        toast.error(error.errorMsg || 'Video call error');
      });

      callFrame.on('camera-error', (event: any) => {
        console.error('📷 Camera error:', event);
        // Don't stop loading - user can still join without camera
      });

      callFrame.on('mic-error', (event: any) => {
        console.error('🎤 Microphone error:', event);
        // Don't stop loading - user can still join without mic
      });

      // Log the actual values being used
      console.log('🚀 Join parameters:', {
        url: roomUrl,
        tokenLength: token.length,
        userName: userName
      });

      // Join the meeting with token
      const joinResult = await callFrame.join({
        url: roomUrl,
        token: token,
        userName: userName,
      });

      console.log('📡 Join result:', joinResult);

    } catch (error) {
      console.error('❌ Error joining call:', error);
      toast.error('Failed to join video call');
      setIsLoading(false);
      
      // Clean up on error
      if (callFrameRef.current) {
        callFrameRef.current.destroy().catch(console.error);
        callFrameRef.current = null;
      }
    }
  };

  const leaveCall = async () => {
    if (callFrameRef.current) {
      try {
        await callFrameRef.current.leave();
      } catch (error) {
        console.error('Error leaving call:', error);
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-hidden">
      {/* Video container */}
      <div 
        ref={containerRef} 
        className="relative w-full h-full"
        style={{ display: isJoined ? 'block' : 'none' }}
      />
      
      {/* Pre-join UI */}
      {!isJoined && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
          <div className="text-center text-white space-y-6 p-8">
            <Video className="w-20 h-20 mx-auto text-purple-400" />
            <div>
              <h3 className="text-3xl font-bold mb-2">{lessonTitle}</h3>
              <p className="text-gray-300">Duration: {duration} minutes</p>
            </div>
            
            <Button 
              onClick={joinCall} 
              disabled={isLoading || !dailyLoaded}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg rounded-full"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Connecting...
                </span>
              ) : !dailyLoaded ? (
                'Loading video...'
              ) : (
                'Join Video Lesson'
              )}
            </Button>
            
            <p className="text-sm text-gray-400">
              Your camera and microphone will be requested
            </p>
          </div>
        </div>
      )}

      {/* Leave button overlay (when joined) */}
      {isJoined && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={leaveCall}
            variant="destructive"
            size="sm"
            className="rounded-full"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            Leave Call
          </Button>
        </div>
      )}
    </div>
  );
}