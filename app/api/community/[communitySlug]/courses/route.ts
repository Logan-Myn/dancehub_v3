import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "@/lib/utils";

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community and its courses
    const { data: courses, error } = await supabase
      .from("courses")
      .select(`
        *,
        community:communities!inner(slug)
      `)
      .eq("community.slug", communitySlug)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses:", error);
      return NextResponse.json(
        { error: "Failed to fetch courses" },
        { status: 500 }
      );
    }

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const imageFile = formData.get("image") as File | null;
    const isPublic = formData.get("is_public") === "true";

    // Generate the slug from the title
    const slug = slugify(title);

    // Set default image URL to placeholder
    let imageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/images/course-placeholder.svg`;
    let fileName = '';

    // Only upload image if one was provided
    if (imageFile && imageFile instanceof File) {
      const fileExt = imageFile.name.split(".").pop();
      fileName = `${uuidv4()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase
        .storage
        .from("course-images")
        .upload(fileName, imageFile, {
          contentType: imageFile.type,
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 }
        );
      }

      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase
        .storage
        .from("course-images")
        .getPublicUrl(fileName);
      
      imageUrl = publicUrl;
    }

    // Create a new course
    const { data: newCourse, error: courseError } = await supabase
      .from("courses")
      .insert({
        title,
        description,
        image_url: imageUrl,
        slug,
        community_id: community.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: isPublic,
      })
      .select()
      .single();

    if (courseError) {
      console.error("Error creating course:", courseError);
      // Clean up the uploaded image if course creation fails
      await supabase.storage.from("course-images").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to create course" },
        { status: 500 }
      );
    }

    return NextResponse.json(newCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
