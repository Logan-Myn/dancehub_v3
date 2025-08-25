import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's email preferences
    const { data: preferences, error: fetchError } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      // If no preferences exist, create default ones
      if (fetchError.code === 'PGRST116') {
        const adminSupabase = createAdminClient();
        const { data: newPreferences, error: createError } = await adminSupabase
          .from('email_preferences')
          .insert({
            user_id: user.id,
            email: user.email,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating preferences:', createError);
          return NextResponse.json(
            { error: "Failed to create preferences" },
            { status: 500 }
          );
        }

        return NextResponse.json({ preferences: newPreferences });
      }

      console.error('Error fetching preferences:', fetchError);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const updates = await request.json();

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.email;
    delete updates.unsubscribe_token;
    delete updates.created_at;

    // Update preferences
    const { data: preferences, error: updateError } = await supabase
      .from('email_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    // Log the preference update
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('email_events')
      .insert({
        user_id: user.id,
        email: user.email,
        event_type: 'preferences_updated',
        email_type: 'preferences',
        metadata: { updates },
      });

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}