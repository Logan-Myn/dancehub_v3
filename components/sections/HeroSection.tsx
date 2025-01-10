"use client";

import { Section } from "@/types/page-builder";
import { Button } from "../ui/button";
import Image from "next/image";
import { UploadCloud, GripVertical, Trash, Settings } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface HeroSectionProps {
  section: Section;
  onUpdate: (content: Section['content']) => void;
  onDelete: () => void;
  isEditing?: boolean;
}

export default function HeroSection({ 
  section, 
  onUpdate, 
  onDelete,
  isEditing = false 
}: HeroSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `community-pages/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      onUpdate({
        ...section.content,
        imageUrl: publicUrl,
      });

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleContentEdit = (
    e: React.FormEvent<HTMLDivElement>, 
    field: 'title' | 'subtitle'
  ) => {
    const content = e.currentTarget.textContent || '';
    onUpdate({
      ...section.content,
      [field]: content,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging ? "opacity-50" : "opacity-100"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Section Content */}
      <div className="relative h-[500px] flex items-center justify-center text-white">
        {section.content.imageUrl && (
          <Image
            src={section.content.imageUrl}
            alt={section.content.title || ''}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4 outline-none"
            contentEditable={isEditing}
            onBlur={(e) => handleContentEdit(e, 'title')}
            suppressContentEditableWarning
          >
            {section.content.title || 'Add title'}
          </h1>
          <p
            className="text-xl md:text-2xl mb-8 outline-none"
            contentEditable={isEditing}
            onBlur={(e) => handleContentEdit(e, 'subtitle')}
            suppressContentEditableWarning
          >
            {section.content.subtitle || 'Add subtitle'}
          </p>
          {section.content.ctaText && (
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-100"
              asChild
            >
              <a href={section.content.ctaLink}>{section.content.ctaText}</a>
            </Button>
          )}
        </div>
      </div>

      {/* Editor Toolbar */}
      {isEditing && isHovered && (
        <div className="absolute top-0 right-0 p-2 flex items-center gap-2 bg-black/75 rounded-bl z-20">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Background Image</label>
                  <div className="flex items-center gap-4">
                    {section.content.imageUrl && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image
                          src={section.content.imageUrl}
                          alt="Background"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <UploadCloud className="h-4 w-4" />
                        <span>{isUploading ? 'Uploading...' : 'Change Image'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Button Text</label>
                  <Input
                    value={section.content.ctaText || ''}
                    onChange={(e) => onUpdate({ 
                      ...section.content, 
                      ctaText: e.target.value 
                    })}
                    placeholder="Enter button text"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Button Link</label>
                  <Input
                    value={section.content.ctaLink || ''}
                    onChange={(e) => onUpdate({ 
                      ...section.content, 
                      ctaLink: e.target.value 
                    })}
                    placeholder="Enter button link"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={onDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
} 