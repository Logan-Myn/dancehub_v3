import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { formatDisplayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { id, email, full_name } = await request.json();
    const supabase = createAdminClient();

    // Generate a consistent avatar URL based on the user's ID
    const avatarUrl = `https://api.multiavatar.com/${id}.svg`;

    // Format the display name using the utility function
    const formattedDisplayName = formatDisplayName(full_name || email?.split('@')[0] || 'User');

    // Update the user's profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id,
        avatar_url: avatarUrl,
        full_name: full_name || email?.split('@')[0] || 'User',
        display_name: formattedDisplayName,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 