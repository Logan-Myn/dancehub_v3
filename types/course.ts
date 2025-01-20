export interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  slug: string;
  community_id: string;
  chapters?: Chapter[];
  is_public?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  chapter_position: number;
  position?: number;
  order?: number;
  created_at: string;
  updated_at: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_asset_id: string | null;
  playback_id: string | null;
  lesson_position: number;
  position?: number;
  order?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  chapter_id: string;
} 