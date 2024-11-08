"use client";

import { useState, useEffect } from 'react';
import { getCommunityBySlug, getCoursesByCommunity, isCommunityMember, Community, Course } from '@/lib/db';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus } from "lucide-react";
import CreateCourseModal from '@/app/components/CreateCourseModal';
import { Progress } from "@/components/ui/progress";
import CommunityNavbar from "@/app/components/CommunityNavbar";
import toast from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/utils';

export default function ClassroomPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (loading) return;

      if (!user) {
        toast.error('Please sign in to access the classroom');
        return;
      }

      try {
        const response = await fetchWithAuth(`/api/community/details`, {
          method: 'POST',
          body: JSON.stringify({ communitySlug }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch community details');
        }

        const communityData = await response.json();
        if (!communityData) {
          router.push('/404');
          return;
        }

        setCommunity(communityData);
        setIsMember(communityData.isMember);
        setIsCreator(user.uid === communityData.createdBy);

        if (communityData.isMember) {
          const coursesResponse = await fetchWithAuth(`/api/courses/list`, {
            method: 'POST',
            body: JSON.stringify({ communityId: communityData.id }),
          });

          if (!coursesResponse.ok) {
            throw new Error('Failed to fetch courses');
          }

          const coursesData = await coursesResponse.json();
          setCourses(coursesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load classroom data');
      }
    }

    fetchData();
  }, [user, loading, communitySlug, router]);

  const handleCourseCreated = async () => {
    if (community) {
      try {
        const response = await fetchWithAuth(`/api/courses/list`, {
          method: 'POST',
          body: JSON.stringify({ communityId: community.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch updated courses');
        }

        const updatedCourses = await response.json();
        setCourses(updatedCourses);
      } catch (error) {
        console.error('Error fetching updated courses:', error);
        toast.error('Failed to refresh courses');
      }
    }
  };

  if (!community) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <CommunityNavbar 
        communitySlug={communitySlug}
        activePage="classroom"
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {community.name} Classroom
          </h2>
          {isCreator && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create New Course
            </Button>
          )}
        </div>

        {isMember ? (
          courses.length === 0 ? (
            <div className="text-center py-12 bg-white shadow rounded-lg">
              <p className="text-xl text-gray-600">No courses available yet.</p>
              {isCreator && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Course
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  communitySlug={communitySlug}
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <p className="text-xl text-gray-600">Join this community to access courses and start learning.</p>
            <Link href={`/community/${communitySlug}`}>
              <Button className="mt-4">
                Go to Community Page
              </Button>
            </Link>
          </div>
        )}
      </main>

      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        communityId={community.id}
        communitySlug={communitySlug}
        onCourseCreated={handleCourseCreated}
      />

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-500">
          © 2024 DanceHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function NavItem({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-${active ? 'gray-900 font-semibold' : 'gray-500 hover:text-gray-900'}`}
    >
      {children}
    </Link>
  );
}

function CourseCard({
  course,
  communitySlug,
}: {
  course: Course;
  communitySlug: string;
}) {
  // Calculate progress
  const totalLessons = course.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  const completedLessons = course.chapters.reduce((sum, chapter) => 
    sum + chapter.lessons.filter(lesson => lesson.completed).length, 0);
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="h-48 overflow-hidden">
        <img
          alt={`Cover image for ${course.title}`}
          className="w-full h-full object-cover"
          src={course.image || "/placeholder.svg"}
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
        <p className="text-gray-600 mb-4">{course.description}</p>
        <div className="mb-4">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500 mt-2">{progress}% Complete</p>
        </div>
        <Link href={`/community/${communitySlug}/classroom/${course.slug}`}>
          <Button className="w-full">
            <BookOpen className="h-5 w-5 mr-2" />
            View Course
          </Button>
        </Link>
      </div>
    </div>
  );
}
