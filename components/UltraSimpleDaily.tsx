"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    DailyIframe: any;
  }
}

interface UltraSimpleDailyProps {
  roomUrl: string;
  token: string;
}

export default function UltraSimpleDaily({ roomUrl, token }: UltraSimpleDailyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Daily script if needed
    const loadDailyAndJoin = async () => {
      // Wait for Daily to be available
      if (!window.DailyIframe) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@daily-co/daily-js';
        script.async = true;
        await new Promise((resolve) => {
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      // Create and join immediately
      try {
        console.log('Creating Daily frame and joining immediately...');
        const frame = window.DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '8px',
          },
          showLeaveButton: true,
          showFullscreenButton: true,
        });

        frameRef.current = frame;

        // Join immediately with token
        console.log('Joining with URL:', roomUrl);
        await frame.join({ 
          url: roomUrl,
          token: token 
        });
        
        console.log('Join command sent');
      } catch (error) {
        console.error('Failed to create/join Daily frame:', error);
      }
    };

    loadDailyAndJoin();

    // Cleanup
    return () => {
      if (frameRef.current) {
        frameRef.current.destroy().catch(console.error);
      }
    };
  }, [roomUrl, token]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[600px] relative bg-gray-900 rounded-lg"
    />
  );
}