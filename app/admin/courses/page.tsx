import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
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

async function getCourses(communityId?: string) {
  const supabase = createServerComponentClient({ cookies });

  // Fetch courses with community info
  let query = supabase
    .from('courses')
    .select(`
      *,
      community:communities(name, slug)
    `)
    .order('created_at', { ascending: false });

  if (communityId && communityId !== 'all') {
    query = query.eq('community_id', communityId);
  }

  const { data: courses, error } = await query;

  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }

  // Get chapter and lesson counts for each course
  const coursesWithCounts = await Promise.all(
    (courses || []).map(async (course) => {
      const [{ count: chaptersCount }, { count: lessonsCount }] = await Promise.all([
        supabase
          .from('chapters')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id),
        supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id),
      ]);

      return {
        ...course,
        chapters_count: chaptersCount || 0,
        lessons_count: lessonsCount || 0,
      };
    })
  );

  return coursesWithCounts;
}

async function getCommunities() {
  const supabase = createServerComponentClient({ cookies });
  const { data: communities, error } = await supabase
    .from('communities')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('Error fetching communities:', error);
    return [];
  }

  return communities;
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
                      href={`/community/${course.community.slug}`}
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