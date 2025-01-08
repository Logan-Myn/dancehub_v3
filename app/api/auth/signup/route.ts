import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { uid, email, displayName } = await request.json();

    // Generate a consistent avatar URL based on the user's ID
    const avatarUrl = `https://api.multiavatar.com/${uid}.svg`;

    // Update the user's profile in Firebase Auth
    await adminAuth.updateUser(uid, {
      photoURL: avatarUrl,
      displayName: displayName || email?.split('@')[0] || 'User',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 