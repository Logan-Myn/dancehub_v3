"use client";

import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Section, SectionType } from "@/types/page-builder";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { v4 as uuidv4 } from 'uuid';
import HeroSection from "./sections/HeroSection";
import TextSection from "./sections/TextSection";
import ImageSection from "./sections/ImageSection";

const AVAILABLE_SECTIONS: { type: SectionType; label: string }[] = [
  { type: "hero", label: "Hero Section" },
  { type: "text", label: "Text Content" },
  { type: "image", label: "Image Section" },
  { type: "features", label: "Features Grid" },
  { type: "testimonials", label: "Testimonials" },
  { type: "cta", label: "Call to Action" },
];

interface PageBuilderProps {
  initialSections: Section[];
  onChange: (sections: Section[]) => void;
  onSave: () => Promise<void>;
  isEditing: boolean;
  isSaving?: boolean;
  communityData?: {
    id: string;
    slug: string;
    membershipEnabled?: boolean;
    membershipPrice?: number;
    stripeAccountId?: string | null;
    isMember?: boolean;
  };
}

export default function PageBuilder({ 
  initialSections = [], 
  onChange,
  onSave,
  isEditing = true,
  isSaving = false,
  communityData
}: PageBuilderProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedSectionType, setSelectedSectionType] = useState<SectionType | ''>('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleAddSection = () => {
    if (!selectedSectionType) return;

    const newSection: Section = {
      id: uuidv4(),
      type: selectedSectionType,
      content: {
        title: 'Add a title',
        subtitle: 'Add a subtitle',
      },
      order: sections.length,
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    onChange(updatedSections);
    setSelectedSectionType('');
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex).map(
          (item, index) => ({ ...item, order: index })
        );

        onChange(newOrder);
        return newOrder;
      });
    }
  };

  const handleUpdateSection = (sectionId: string, content: Section['content']) => {
    const updatedSections = sections.map((section) =>
      section.id === sectionId ? { ...section, content } : section
    );
    
    setSections(updatedSections);
    onChange(updatedSections);
  };

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = sections
      .filter((section) => section.id !== sectionId)
      .map((section, index) => ({ ...section, order: index }));
    
    setSections(updatedSections);
    onChange(updatedSections);
  };

  return (
    <div className="space-y-6">
      {isEditing && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedSectionType}
            onValueChange={(value) => setSelectedSectionType(value as SectionType)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Add new section" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_SECTIONS.map((section) => (
                <SelectItem key={section.type} value={section.type}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddSection}
            disabled={!selectedSectionType}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                {section.type === "hero" && (
                  <HeroSection
                    section={section}
                    onUpdate={(content) => handleUpdateSection(section.id, content)}
                    onDelete={() => handleDeleteSection(section.id)}
                    isEditing={isEditing}
                    communityData={communityData}
                  />
                )}
                {section.type === "text" && (
                  <TextSection
                    section={section}
                    onUpdate={(content) => handleUpdateSection(section.id, content)}
                    onDelete={() => handleDeleteSection(section.id)}
                    isEditing={isEditing}
                  />
                )}
                {section.type === "image" && (
                  <ImageSection
                    section={section}
                    onUpdate={(content) => handleUpdateSection(section.id, content)}
                    onDelete={() => handleDeleteSection(section.id)}
                    isEditing={isEditing}
                  />
                )}
                {!["hero", "text", "image"].includes(section.type) && (
                  <div className="p-4 border rounded-lg">
                    {section.type} section (component coming soon)
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isEditing && sections.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={onSave} className="bg-black text-white hover:bg-gray-800">
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
} 