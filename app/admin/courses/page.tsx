import { sql } from '@/lib/db';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, MoreVertical, Layers, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DeleteCourseButton } from '@/components/admin/delete-course-button';
import { EditCourseButton } from '@/components/admin/edit-course-button';
import { CourseFilters } from '@/components/admin/course-filters';

type Course = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  community_id: string;
  community: {
    name: string;
    slug: string;
  };
  chapters_count: number;
  lessons_count: number;
};

type Community = {
  id: string;
  name: string;
  slug: string;
};

async function getCourses(communityId?: string): Promise<Course[]> {
  // Fetch courses
  let courses;
  if (communityId && communityId !== 'all') {
    courses = await sql`
      SELECT c.id, c.title, c.description, c.image_url, c.created_at, c.community_id,
             com.name as community_name, com.slug as community_slug
      FROM courses c
      JOIN communities com ON com.id = c.community_id
      WHERE c.community_id = ${communityId}
      ORDER BY c.created_at DESC
    ` as { id: string; title: string; description: string | null; image_url: string | null; created_at: string; community_id: string; community_name: string; community_slug: string }[];
  } else {
    courses = await sql`
      SELECT c.id, c.title, c.description, c.image_url, c.created_at, c.community_id,
             com.name as community_name, com.slug as community_slug
      FROM courses c
      JOIN communities com ON com.id = c.community_id
      ORDER BY c.created_at DESC
    ` as { id: string; title: string; description: string | null; image_url: string | null; created_at: string; community_id: string; community_name: string; community_slug: string }[];
  }

  if (!courses || courses.length === 0) {
    return [];
  }

  // Get all course IDs
  const courseIds = courses.map(c => c.id);

  // Fetch chapter counts and chapter IDs
  const chapterData = await sql`
    SELECT course_id, id, COUNT(*) OVER (PARTITION BY course_id) as chapter_count
    FROM chapters
    WHERE course_id = ANY(${courseIds})
  ` as { course_id: string; id: string; chapter_count: number }[];

  // Get unique chapter IDs
  const chapterIds = chapterData.map(c => c.id);

  // Fetch lesson counts by chapter
  let lessonCountsByChapter: { chapter_id: string; count: number }[] = [];
  if (chapterIds.length > 0) {
    lessonCountsByChapter = await sql`
      SELECT chapter_id, COUNT(*) as count
      FROM lessons
      WHERE chapter_id = ANY(${chapterIds})
      GROUP BY chapter_id
    ` as { chapter_id: string; count: number }[];
  }

  // Create lookup maps
  const chapterCountMap = new Map<string, number>();
  const chaptersByCourse = new Map<string, string[]>();

  chapterData.forEach(c => {
    chapterCountMap.set(c.course_id, Number(c.chapter_count));
    if (!chaptersByCourse.has(c.course_id)) {
      chaptersByCourse.set(c.course_id, []);
    }
    chaptersByCourse.get(c.course_id)!.push(c.id);
  });

  const lessonCountByChapter = new Map(lessonCountsByChapter.map(l => [l.chapter_id, Number(l.count)]));

  // Build the final result
  const coursesWithCounts = courses.map(course => {
    const chapters = chaptersByCourse.get(course.id) || [];
    const lessonsCount = chapters.reduce((sum, chapterId) => sum + (lessonCountByChapter.get(chapterId) || 0), 0);

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      image_url: course.image_url,
      created_at: course.created_at,
      community_id: course.community_id,
      community: {
        name: course.community_name,
        slug: course.community_slug,
      },
      chapters_count: chapterCountMap.get(course.id) || 0,
      lessons_count: lessonsCount,
    };
  });

  return coursesWithCounts;
}

async function getCommunities(): Promise<Community[]> {
  const communities = await sql`
    SELECT id, name, slug
    FROM communities
    ORDER BY name
  ` as Community[];

  return communities || [];
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { community?: string };
}) {
  const [communities, courses] = await Promise.all([
    getCommunities(),
    getCourses(searchParams.community),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Courses</h2>
        <CourseFilters communities={communities} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Community</TableHead>
              <TableHead>Chapters</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course: Course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={course.image_url || undefined} />
                        <AvatarFallback>
                          <BookOpen className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{course.title}</span>
                        {course.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {course.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/${course.community.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {course.community.name}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span>{course.chapters_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{course.lessons_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(course.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <EditCourseButton
                          courseId={course.id}
                          courseTitle={course.title}
                          courseDescription={course.description || ''}
                        />
                        <DeleteCourseButton
                          courseId={course.id}
                          courseTitle={course.title}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
