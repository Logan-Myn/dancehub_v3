import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string };
  }
) {
  try {
    const supabase = createAdminClient();

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      console.error("Error fetching community:", communityError);
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, description")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      console.error("Error fetching course:", courseError);
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get all community members
    const { data: members, error: membersError } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", community.id);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Get member profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", members.map(m => m.user_id));

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    console.log('Sending emails to members:', profiles.map(p => ({ id: p.id, email: p.email })));

    // Send email to each member
    const emailResults = await Promise.allSettled(profiles.map(async (profile) => {
      if (!profile.email) return;

      const courseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/community/${params.communitySlug}/classroom/${params.courseSlug}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Course Available!</h2>
          <p>Hello ${profile.full_name || 'Member'},</p>
          <p>A new course is now available in your community:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2563eb; margin: 0 0 10px 0;">${course.title}</h3>
            <p style="color: #666; margin: 0 0 10px 0;">${course.description}</p>
            <p style="color: #666; margin: 0;">Community: ${community.name}</p>
          </div>
          <a href="${courseUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Course</a>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This email was sent from DanceHub. If you don't want to receive these emails, you can manage your notification settings in your account.
          </p>
        </div>
      `;

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile.email,
          subject: `New Course Available: ${course.title}`,
          html: emailHtml
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to send email to ${profile.email}: ${errorData.error || response.statusText}`);
      }

      return { email: profile.email, success: true };
    }));

    // Check results and log any failures
    const failures = emailResults.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some emails failed to send:', failures);
    }

    const successes = emailResults.filter(result => result.status === 'fulfilled');
    console.log(`Successfully sent ${successes.length} out of ${emailResults.length} emails`);

    return NextResponse.json({
      success: true,
      totalEmails: emailResults.length,
      successfulEmails: successes.length,
      failedEmails: failures.length
    });
  } catch (error) {
    console.error("Error in notify route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 