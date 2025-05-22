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
import CTASection from "./sections/CTASection";
import VideoSection from "./sections/VideoSection";
import { Card } from "./ui/card";

const AVAILABLE_SECTIONS: { type: SectionType; label: string }[] = [
  { type: "hero", label: "Hero Section" },
  { type: "text", label: "Text Content" },
  { type: "image", label: "Image Section" },
  { type: "cta", label: "Call to Action" },
  { type: "video", label: "Video Section" },
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

  // Template definitions
  const TEMPLATES = [
    {
      key: 'classic',
      name: 'Classic Introduction',
      description: 'A welcoming hero, your story, a team photo, and a call to action.',
      sections: [
        {
          type: 'hero',
          content: {
            title: 'Welcome to Our Community!',
            subtitle: 'Join us and be part of something special.',
            buttonType: 'join' as const,
          },
        },
        {
          type: 'text',
          content: {
            title: 'About Us',
            text: 'We are passionate about dance and building a vibrant community. Our story began...'
          },
        },
        {
          type: 'image',
          content: {
            imageUrl: '',
            caption: 'Our team or studio',
            altText: 'Team or studio photo',
          },
        },
        {
          type: 'cta',
          content: {
            title: 'Ready to Join?',
            ctaText: 'Become a member',
            ctaLink: '',
            buttonType: 'join' as const,
          },
        },
      ],
    },
    {
      key: 'media',
      name: 'Media Welcome',
      description: 'A big intro, welcome video, short about, and a call to action.',
      sections: [
        {
          type: 'hero',
          content: {
            title: 'Welcome to Our Dance Community!',
            subtitle: 'Watch our story and join the movement.',
            buttonType: 'join' as const,
          },
        },
        {
          type: 'video',
          content: {
            title: 'Welcome Video',
            videoId: '',
            description: 'A quick look at what we do.'
          },
        },
        {
          type: 'text',
          content: {
            title: 'Who We Are',
            text: 'We bring dancers together to learn, share, and grow.'
          },
        },
        {
          type: 'cta',
          content: {
            title: 'Join Us',
            ctaText: 'Become a member',
            ctaLink: '',
            buttonType: 'join' as const,
          },
        },
      ],
    },
  ];

  // Template selection handler
  const handleTemplateSelect = (templateKey: string) => {
    const template = TEMPLATES.find(t => t.key === templateKey);
    if (!template) return;
    const newSections = template.sections.map((section, idx) => ({
      id: uuidv4(),
      type: section.type as SectionType,
      content: section.content,
      order: idx,
    }));
    setSections(newSections);
    onChange(newSections);
  };

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
        ...(selectedSectionType === 'hero' && {
          buttonType: 'join'
        })
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
      {/* Template selection UI */}
      {isEditing && sections.length === 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Start with a template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATES.map((template) => (
              <Card key={template.key} className="p-4 flex flex-col gap-2 border border-gray-200">
                <div className="font-bold text-lg">{template.name}</div>
                <div className="text-gray-600 text-sm mb-2">{template.description}</div>
                <Button onClick={() => handleTemplateSelect(template.key)}>
                  Use this template
                </Button>
              </Card>
            ))}
          </div>
          <div className="mt-6 text-center text-gray-500 text-sm">Or build your page from scratch below.</div>
        </div>
      )}

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
                {section.type === "cta" && (
                  <CTASection
                    section={section}
                    onUpdate={(content) => handleUpdateSection(section.id, content)}
                    onDelete={() => handleDeleteSection(section.id)}
                    isEditing={isEditing}
                    communityData={communityData}
                  />
                )}
                {section.type === "video" && (
                  <VideoSection
                    section={section}
                    onUpdate={(content) => handleUpdateSection(section.id, content)}
                    onDelete={() => handleDeleteSection(section.id)}
                    isEditing={isEditing}
                  />
                )}
                {!["hero", "text", "image", "cta", "video"].includes(section.type) && (
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
          <Button onClick={onSave}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
} 