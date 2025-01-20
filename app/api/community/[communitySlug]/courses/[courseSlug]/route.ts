import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

interface CommunityMember {
  user_id: string;
  user: {
    email: string;
    full_name: string;
  };
}

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string };
  }
) {
  try {
    const supabase = createAdminClient();

    // Get community ID
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    // Get course with basic info
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        slug
      `)
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      console.error("Error fetching course:", courseError);
      return new NextResponse("Course not found", { status: 404 });
    }

    // Get chapters with explicit ordering
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("course_id", course.id)
      .order("chapter_position", { ascending: true });

    if (chaptersError) {
      console.error("Error fetching chapters:", chaptersError);
      return new NextResponse("Failed to fetch chapters", { status: 500 });
    }

    console.log('Fetched chapters:', chapters.map(c => ({
      id: c.id,
      title: c.title,
      chapter_position: c.chapter_position
    })));

    // Get lessons for each chapter with explicit ordering
    const chaptersWithLessons = await Promise.all(
      chapters.map(async (chapter) => {
        console.log(`Fetching lessons for chapter ${chapter.id} (${chapter.title})`);
        
        // Get raw lessons data directly from database with explicit ordering
        const { data: lessons, error: lessonsError } = await supabase
          .from("lessons")
          .select("*")
          .eq("chapter_id", chapter.id)
          .order("lesson_position", { ascending: true });

        if (lessonsError) {
          console.error("Error fetching lessons:", lessonsError);
          throw lessonsError;
        }

        console.log(`Raw lessons for chapter ${chapter.id}:`, 
          lessons.map(l => ({
            id: l.id,
            title: l.title,
            lesson_position: l.lesson_position
          }))
        );

        // Return chapter with its raw lessons data
        return {
          ...chapter,
          lessons: lessons
        };
      })
    );

    const fullCourse = {
      ...course,
      chapters: chaptersWithLessons
    };

    console.log('Final data structure:', {
      course_id: course.id,
      chapters: fullCourse.chapters.map((c: any) => ({
        id: c.id,
        title: c.title,
        chapter_position: c.chapter_position,
        lessons: c.lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          lesson_position: l.lesson_position
        }))
      }))
    });

    console.log('Final data being sent:', JSON.stringify(fullCourse, null, 2));

    return new NextResponse(JSON.stringify(fullCourse), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error("Error in course route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string };
  }
) {
  try {
    const supabase = createAdminClient();

    // Get community with more details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    // Get current course state to check if visibility is changing
    const { data: currentCourse, error: courseError } = await supabase
      .from("courses")
      .select("id, is_public")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !currentCourse) {
      return new NextResponse("Course not found", { status: 404 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const isPublic = formData.get("is_public") === "true";

    // Update the course
    const { data: updatedCourse, error: updateError } = await supabase
      .from("courses")
      .update({
        title,
        description,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentCourse.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating course:", updateError);
      return new NextResponse("Failed to update course", { status: 500 });
    }

    // If course is being made public, notify community members
    if (isPublic && !currentCourse.is_public) {
      try {
        // Get all community members with their profiles
        const { data: members, error: membersError } = await supabase
          .from("community_members")
          .select(`
            user_id,
            user:profiles!user_id (
              email,
              full_name
            )
          `)
          .eq("community_id", community.id)
          .returns<CommunityMember[]>();

        if (membersError) throw membersError;

        // Send email to each member
        const emailPromises = members.map(async (member) => {
          if (!member.user?.email) return; // Skip if no email found
          
          const courseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/community/${params.communitySlug}/classroom/${params.courseSlug}`;
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Course Available!</h2>
              <p>Hello ${member.user?.full_name || 'Member'},</p>
              <p>A new course is now available in your community:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2563eb; margin: 0 0 10px 0;">${title}</h3>
                <p style="color: #666; margin: 0 0 10px 0;">${description}</p>
                <p style="color: #666; margin: 0;">Community: ${community.name}</p>
              </div>
              <a href="${courseUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Course</a>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This email was sent from DanceHub. If you don't want to receive these emails, you can manage your notification settings in your account.
              </p>
            </div>
          `;

          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: member.user.email,
              subject: `New Course Available: ${title}`,
              html: emailHtml
            })
          });
        });

        // Wait for all emails to be sent
        await Promise.all(emailPromises);
      } catch (error) {
        console.error("Error sending notification emails:", error);
        // Don't fail the update if email sending fails
      }
    }

    return new NextResponse(JSON.stringify(updatedCourse), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in PUT course route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
} 