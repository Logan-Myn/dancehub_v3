import { Course } from "@/types/course";

interface Props {
  course: Course;
  onClick: () => void;
}

export default function CourseCard({ course, onClick }: Props) {
  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {course.image_url && (
        <img
          src={course.image_url}
          alt={course.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
        <p className="text-gray-600 text-sm">{course.description}</p>
      </div>
    </div>
  );
}
