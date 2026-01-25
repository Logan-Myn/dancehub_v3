import { Course } from "@/types/course";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  course: Course;
  onClick: () => void;
}

export default function CourseCard({ course, onClick }: Props) {
  return (
    <div
      className={cn(
        "group bg-card rounded-2xl overflow-hidden cursor-pointer",
        "border-2 border-transparent",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:border-primary/20",
        "hover:-translate-y-0.5 hover:rotate-[-0.3deg]"
      )}
      onClick={onClick}
    >
      {/* Image container with gradient overlay */}
      <div className="relative h-48 overflow-hidden bg-muted/30">
        {course.image_url ? (
          <>
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-2">
        <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}
      </div>
    </div>
  );
}
