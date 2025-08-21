import { NextResponse } from "next/server";
import { videoRoomService } from "@/lib/video-room-service";

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    
    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing booking ID" },
        { status: 400 }
      );
    }

    await videoRoomService.endSession(bookingId);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error ending video session:', error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}