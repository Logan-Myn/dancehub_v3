"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { toast } from "react-hot-toast";

declare global {
  interface Window {
    DailyIframe: any;
  }
}

interface SimpleDailyCallProps {
  roomUrl: string;
  token?: string;
  userName?: string;
  lessonTitle: string;
  duration: number;
}

export default function SimpleDailyCall({
  roomUrl,
  token,
  userName = "User",
  lessonTitle,
  duration,
}: SimpleDailyCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load Daily.co script if not already loaded
    if (typeof window !== 'undefined' && !window.DailyIframe) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const joinCall = async () => {
    if (!containerRef.current) {
      toast.error('Container not ready');
      return;
    }

    if (!window.DailyIframe) {
      toast.error('Daily.co not loaded yet. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      // Create a simple iframe
      const callFrame = window.DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '0',
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      // Listen for join
      callFrame.on('joined-meeting', () => {
        console.log('✅ Joined meeting');
        setIsJoined(true);
        setIsLoading(false);
      });

      // Listen for leave
      callFrame.on('left-meeting', () => {
        console.log('👋 Left meeting');
        setIsJoined(false);
        callFrame.destroy();
      });

      // Listen for errors
      callFrame.on('error', (e: any) => {
        console.error('Daily error:', e);
        setIsLoading(false);
        toast.error('Failed to join');
      });

      // Try joining with just the URL first (for testing)
      console.log('Attempting to join with URL:', roomUrl);
      
      if (token) {
        // If we have a token, use it
        console.log('Joining with token...');
        await callFrame.join({
          url: roomUrl,
          token: token,
        });
      } else {
        // Otherwise just join with URL (for public rooms)
        console.log('Joining without token (public mode)...');
        await callFrame.join({
          url: roomUrl,
        });
      }
    } catch (error) {
      console.error('Join error:', error);
      setIsLoading(false);
      toast.error('Failed to join call');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-hidden">
      <div 
        ref={containerRef} 
        className="relative w-full h-full"
        style={{ display: isJoined ? 'block' : 'none' }}
      />
      
      {!isJoined && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
          <div className="text-center text-white space-y-6 p-8">
            <Video className="w-20 h-20 mx-auto text-purple-400" />
            <div>
              <h3 className="text-3xl font-bold mb-2">{lessonTitle}</h3>
              <p className="text-gray-300">Duration: {duration} minutes</p>
              <p className="text-sm text-gray-400 mt-2">Room URL: {roomUrl?.substring(0, 50)}...</p>
            </div>
            
            <Button 
              onClick={joinCall} 
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg rounded-full"
              size="lg"
            >
              {isLoading ? 'Connecting...' : 'Join Lesson'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}