import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { PageData } from "@/types/page-builder";

const supabase = createAdminClient();

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;
    const { aboutPage } = await request.json();

    // Get and update the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .update({
        about_page: {
          ...aboutPage,
          meta: {
            last_updated: new Date().toISOString(),
            published_version: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("slug", communitySlug)
      .select()
      .single();

    if (communityError) {
      console.error("Error updating community:", communityError);
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "About page updated successfully",
      data: aboutPage,
    });
  } catch (error) {
    console.error("Error updating about page:", error);
    return NextResponse.json(
      { error: "Failed to update about page" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("about_page")
      .eq("slug", communitySlug)
      .single();

    if (communityError) {
      console.error("Error fetching community:", communityError);
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Return the about page data if it exists
    return NextResponse.json({
      aboutPage: community.about_page || {
        sections: [],
        meta: {
          last_updated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching about page:", error);
    return NextResponse.json(
      { error: "Failed to fetch about page" },
      { status: 500 }
    );
  }
} 