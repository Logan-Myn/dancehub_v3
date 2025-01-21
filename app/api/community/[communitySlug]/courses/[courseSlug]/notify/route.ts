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
    const supabase = await createAdminClient();

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, description")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Get all community members
    const { data: members, error: membersError } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", community.id);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return new NextResponse("Failed to fetch members", { status: 500 });
    }

    // Get member profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", members.map(m => m.user_id));

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new NextResponse("Failed to fetch profiles", { status: 500 });
    }

    // Send email to each member
    const emailPromises = profiles.map(async (profile) => {
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

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
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
    });

    await Promise.all(emailPromises);

    return new NextResponse(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
} 