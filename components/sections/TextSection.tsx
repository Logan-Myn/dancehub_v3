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
      {/* Editor Toolbar - Fluid Movement */}
      {isEditing && isHovered && (
        <div className="absolute top-4 right-4 p-2 flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg z-20">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
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
                className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 rounded-xl border-border/50">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Container Width</label>
                  <Select
                    value={section.content.width || 'full'}
                    onValueChange={(value: "narrow" | "medium" | "full") =>
                      onUpdate({ ...section.content, width: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl border-border/50">
                      <SelectValue placeholder="Select width" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="narrow" className="rounded-lg">Narrow</SelectItem>
                      <SelectItem value="medium" className="rounded-lg">Medium</SelectItem>
                      <SelectItem value="full" className="rounded-lg">Full Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Background</label>
                  <Select
                    value={section.content.background || 'white'}
                    onValueChange={(value: "white" | "light" | "dark") =>
                      onUpdate({ ...section.content, background: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl border-border/50">
                      <SelectValue placeholder="Select background" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="white" className="rounded-lg">White</SelectItem>
                      <SelectItem value="light" className="rounded-lg">Light (Muted)</SelectItem>
                      <SelectItem value="dark" className="rounded-lg">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Content - Fluid Movement */}
      <div
        className={cn(
          "py-12 md:py-16 rounded-2xl transition-colors duration-300",
          section.content.background === 'white' && "bg-card",
          section.content.background === 'light' && "bg-muted/50",
          section.content.background === 'dark' && "bg-foreground/95 text-background"
        )}
      >
        <div
          className={cn(
            "mx-auto px-6",
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