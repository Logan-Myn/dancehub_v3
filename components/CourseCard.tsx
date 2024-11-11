import { Course } from "@/types/course";
import Image from "next/image";

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <Image
        src={course.imageUrl}
        alt={course.title}
        width={400}
        height={225}
        className="w-full h-56 object-cover"
      />
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
        <p className="text-gray-600">{course.description}</p>
      </div>
    </div>
  );
} 