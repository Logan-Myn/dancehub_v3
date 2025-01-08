"use client";

import { Section } from "@/types/page-builder";
import { Button } from "../ui/button";
import { GripVertical, Trash, Settings } from "lucide-react";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Editor from "../Editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TextSectionProps {
  section: Section;
  onUpdate: (content: Section['content']) => void;
  onDelete: () => void;
  isEditing?: boolean;
}

export default function TextSection({ 
  section, 
  onUpdate, 
  onDelete,
  isEditing = false 
}: TextSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const handleContentChange = (html: string) => {
    onUpdate({
      ...section.content,
      text: html,
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
                  <label className="text-sm font-medium">Container Width</label>
                  <Select
                    value={section.content.width || 'full'}
                    onValueChange={(value: "narrow" | "medium" | "full") => 
                      onUpdate({ ...section.content, width: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select width" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="narrow">Narrow</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="full">Full Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Background</label>
                  <Select
                    value={section.content.background || 'white'}
                    onValueChange={(value: "white" | "light" | "dark") => 
                      onUpdate({ ...section.content, background: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select background" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="light">Light Gray</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
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
      <div 
        className={cn(
          "py-12",
          section.content.background === 'light' && "bg-gray-50",
          section.content.background === 'dark' && "bg-gray-900 text-white"
        )}
      >
        <div 
          className={cn(
            "mx-auto px-4",
            section.content.width === 'narrow' && "max-w-2xl",
            section.content.width === 'medium' && "max-w-4xl",
            section.content.width === 'full' && "max-w-7xl"
          )}
        >
          <Editor
            content={section.content.text || ''}
            onChange={handleContentChange}
            editable={isEditing}
          />
        </div>
      </div>
    </div>
  );
} 