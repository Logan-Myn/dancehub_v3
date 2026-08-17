"use client";

import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Course } from "@/types/course";

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onUpdateCourse: (updates: {
    title: string;
    description: string;
    image?: File | null;
    is_public: boolean;
  }) => Promise<void>;
  onDeleteCourse?: () => Promise<void>;
}

export default function EditCourseModal({
  isOpen,
  onClose,
  course,
  onUpdateCourse,
  onDeleteCourse,
}: EditCourseModalProps) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [isPublic, setIsPublic] = useState(course.is_public ?? true);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(course.image_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onUpdateCourse({
        title,
        description,
        image,
        is_public: isPublic,
      });
      // Success feedback belongs to the caller, which knows whether the save
      // also published the course.
      onClose();
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteCourse) return;
    setIsDeleting(true);

    try {
      await onDeleteCourse();
      // The caller navigates away on success, so there is no state to reset.
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete course");
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  // Confirmation replaces the form rather than stacking a second dialog on top
  // of it, which the drawer variant on mobile cannot render reliably.
  if (isConfirmingDelete) {
    return (
      <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
        <ResponsiveDialogContent className="sm:max-w-[425px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete course</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              This permanently deletes &quot;{course.title}&quot;, along with all of its
              chapters, lessons and videos. Members lose access and their progress. This
              cannot be undone.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete course"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[425px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit Course</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Update your course details.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label>Course Image</Label>
              <div
                {...getRootProps()}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <input {...getInputProps()} />
                {previewUrl ? (
                  <div className="relative w-full h-40">
                    <Image
                      src={previewUrl}
                      alt="Course preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="py-4">
                    {isDragActive ? (
                      <p>Drop the image here...</p>
                    ) : (
                      <p>Drag and drop an image here, or click to select</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="public">Make course public</Label>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {onDeleteCourse && (
              <div className="border-t pt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Delete this course</p>
                  <p className="text-sm text-muted-foreground">
                    Removes the course and everything in it.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={isSubmitting}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
} 