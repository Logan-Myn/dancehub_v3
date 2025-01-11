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
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
  order?: number;
  position: number;
}

export interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl?: string;
  videoAssetId?: string | null;
  completed?: boolean;
  order?: number;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
} 