"use client";

import { Section } from "@/types/page-builder";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash, Settings, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { uploadFileToStorage, STORAGE_FOLDERS } from "@/lib/storage-client";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import toast from "react-hot-toast";

interface ImageSectionProps {
  section: Section;
  onUpdate: (content: Section['content']) => void;
  onDelete: () => void;
  isEditing?: boolean;
}

export default function ImageSection({ 
  section, 
  onUpdate, 
  onDelete,
  isEditing = false 
}: ImageSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

      // Upload to B2 Storage via API
      const imageUrl = await uploadFileToStorage(file, STORAGE_FOLDERS.COMMUNITY_PAGES);

      onUpdate({
        ...section.content,
        imageUrl,
      });

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group image-section",
        isDragging ? "opacity-50" : "opacity-100"
      )}
      onMouseEnter={() => {
        if (!isSettingsOpen) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (!isSettingsOpen) {
          setIsHovered(false);
        }
      }}
    >
      {/* Editor Toolbar */}
      {isEditing && (isHovered || isSettingsOpen) && (
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
          <Popover 
            open={isSettingsOpen} 
            onOpenChange={(open) => {
              setIsSettingsOpen(open);
              if (open) {
                setIsHovered(false);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-80"
              onInteractOutside={(e) => {
                // Allow closing when clicking outside the section
                const target = e.target as HTMLElement;
                if (!target.closest('.image-section')) {
                  setIsSettingsOpen(false);
                }
                // Prevent closing when interacting with select
                if (target.closest('[role="listbox"]')) {
                  e.preventDefault();
                }
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image</label>
                  <div className="flex items-center gap-4">
                    {section.content.imageUrl && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image
                          src={section.content.imageUrl}
                          alt="Section image"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <UploadCloud className="h-4 w-4" />
                        <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
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
                  <label className="text-sm font-medium">Caption</label>
                  <Input
                    value={section.content.caption || ''}
                    onChange={(e) => onUpdate({ 
                      ...section.content, 
                      caption: e.target.value 
                    })}
                    placeholder="Add image caption"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Layout</label>
                  <Select
                    value={section.content.layout || 'full'}
                    onValueChange={(value: "full" | "contained" | "float-left" | "float-right") => {
                      onUpdate({ ...section.content, layout: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="full">Full Width</SelectItem>
                      <SelectItem value="contained">Contained</SelectItem>
                      <SelectItem value="float-left">Float Left</SelectItem>
                      <SelectItem value="float-right">Float Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Alt Text</label>
                  <Input
                    value={section.content.altText || ''}
                    onChange={(e) => onUpdate({ 
                      ...section.content, 
                      altText: e.target.value 
                    })}
                    placeholder="Describe the image for accessibility"
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

      {/* Content */}
      <div className="py-12">
        <div 
          className={cn(
            "mx-auto px-4 w-full",
            section.content.layout === 'contained' && "max-w-4xl",
            section.content.layout === 'float-left' && "float-left mr-8 max-w-md",
            section.content.layout === 'float-right' && "float-right ml-8 max-w-md"
          )}
        >
          {section.content.imageUrl ? (
            <figure className="relative w-full min-h-[300px]">
              <div className={cn(
                "relative w-full h-full min-h-[300px]",
                section.content.layout === 'full' && "h-[calc(100vw*9/21)]",
                section.content.layout === 'contained' && "h-[calc(100vw*9/16)]",
                (section.content.layout === 'float-left' || section.content.layout === 'float-right') && "h-[300px]"
              )}>
                <Image
                  src={section.content.imageUrl}
                  alt={section.content.altText || ''}
                  fill
                  priority
                  loading="eager"
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => {
                    console.error('Image failed to load:', section.content.imageUrl);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              {section.content.caption && (
                <figcaption className="text-sm text-gray-500 mt-2 text-center">
                  {section.content.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            isEditing && (
              <div className="h-[300px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-500">Upload an image</span>
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
            )
          )}
        </div>
        {/* Add clearfix for floated layouts */}
        {(section.content.layout === 'float-left' || section.content.layout === 'float-right') && (
          <div className="clear-both" />
        )}
      </div>
    </div>
  );
} 