"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Course } from "@/types/course";
import { createClient } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCourse: (newCourse: Omit<Course, 'id'>) => void;
  communityId: string;
}

export default function CreateCourseModal({
  isOpen,
  onClose,
  onCreateCourse,
  communityId,
}: CreateCourseModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    // Only accept images under 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Please upload an image smaller than 5MB');
      return;
    }
    setImage(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      
      if (image) {
        // Upload image to Supabase Storage
        const fileExt = image.name.split('.').pop();
        const fileName = `${communityId}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('course-images')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('course-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const newCourse = {
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl,
        community_id: communityId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        slug: slugify(title.trim()),
      };

      onCreateCourse(newCourse);
      setTitle("");
      setDescription("");
      setImage(null);
      onClose();
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Course</DialogTitle>
          <DialogDescription>
            Enter the details for the new course.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                required
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                required
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label htmlFor="image" className="text-sm font-medium">
                Course Image
              </label>
              <div 
                {...getRootProps()}
                className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer ${
                  isDragActive ? 'border-blue-500' : 'border-gray-300'
                }`}
              >
                <input {...getInputProps()} />
                {image ? (
                  <div>
                    <Image 
                      src={URL.createObjectURL(image)}
                      alt="Course Image"
                      width={200}
                      height={200}
                      className="mx-auto object-cover rounded-md"
                    />
                    <p className="mt-2 text-sm text-gray-500">{image.name}</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    <p>Drag and drop an image here, or click to select an image</p>
                    <p className="mt-1">Max size: 5MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
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
              {isSubmitting ? 'Creating...' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 