import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const supabase = createAdminClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const type = searchParams.get('type'); // Optional: specific email type to unsubscribe from

    if (!token) {
      return NextResponse.redirect(new URL('/unsubscribe/error', request.url));
    }

    // Find the email preferences by unsubscribe token
    const { data: preferences, error: fetchError } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('unsubscribe_token', token)
      .single();

    if (fetchError || !preferences) {
      console.error('Error fetching preferences:', fetchError);
      return NextResponse.redirect(new URL('/unsubscribe/invalid', request.url));
    }

    // Update preferences based on type
    let updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (type) {
      // Unsubscribe from specific type
      switch (type) {
        case 'marketing':
          updateData.marketing_emails = false;
          break;
        case 'course_announcements':
          updateData.course_announcements = false;
          break;
        case 'community_updates':
          updateData.community_updates = false;
          break;
        case 'weekly_digest':
          updateData.weekly_digest = false;
          break;
        default:
          // Unknown type, unsubscribe from all non-transactional
          updateData.marketing_emails = false;
          updateData.course_announcements = false;
          updateData.community_updates = false;
          updateData.weekly_digest = false;
      }
    } else {
      // Unsubscribe from all non-transactional emails
      updateData = {
        ...updateData,
        marketing_emails: false,
        course_announcements: false,
        community_updates: false,
        weekly_digest: false,
        unsubscribed_all: true,
        unsubscribed_at: new Date().toISOString(),
      };
    }

    // Update the preferences
    const { error: updateError } = await supabase
      .from('email_preferences')
      .update(updateData)
      .eq('unsubscribe_token', token);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.redirect(new URL('/unsubscribe/error', request.url));
    }

    // Log the unsubscribe event
    await supabase
      .from('email_events')
      .insert({
        user_id: preferences.user_id,
        email: preferences.email,
        event_type: 'unsubscribed',
        email_type: type || 'all_marketing',
        metadata: { token, type },
      });

    // Redirect to success page
    return NextResponse.redirect(new URL('/unsubscribe/success', request.url));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.redirect(new URL('/unsubscribe/error', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, preferences: newPreferences } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Missing unsubscribe token" },
        { status: 400 }
      );
    }

    // Find the email preferences by unsubscribe token
    const { data: existingPreferences, error: fetchError } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('unsubscribe_token', token)
      .single();

    if (fetchError || !existingPreferences) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Update preferences
    const { error: updateError } = await supabase
      .from('email_preferences')
      .update({
        ...newPreferences,
        updated_at: new Date().toISOString(),
        // Reset unsubscribed_all if user is re-subscribing to something
        unsubscribed_all: false,
      })
      .eq('unsubscribe_token', token);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    // Log the preference update
    await supabase
      .from('email_events')
      .insert({
        user_id: existingPreferences.user_id,
        email: existingPreferences.email,
        event_type: 'preferences_updated',
        email_type: 'preferences',
        metadata: { newPreferences },
      });

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: newPreferences,
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}