import { NextResponse } from "next/server";
import { videoRoomService } from "@/lib/video-room-service";

export async function POST(request: Request) {
  try {
    const { bookingId, userRole } = await request.json();
    
    if (!bookingId || !userRole) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (userRole !== 'teacher' && userRole !== 'student') {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 400 }
      );
    }

    await videoRoomService.startSession(bookingId, userRole);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error starting video session:', error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}