"use client";

import { Section } from "@/types/page-builder";
import { Button } from "../ui/button";
import Image from "next/image";
import { UploadCloud, GripVertical, Trash, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import PaymentModal from "@/components/PaymentModal";

interface HeroSectionProps {
  section: Section;
  onUpdate: (content: Section['content']) => void;
  onDelete: () => void;
  isEditing?: boolean;
  communityData?: {
    id: string;
    slug: string;
    membershipEnabled?: boolean;
    membershipPrice?: number;
    stripeAccountId?: string | null;
    isMember?: boolean;
  };
}

export default function HeroSection({ 
  section, 
  onUpdate, 
  onDelete,
  isEditing = false,
  communityData
}: HeroSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const { showAuthModal } = useAuthModal();
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

  // Log when component mounts
  useEffect(() => {
    console.log('HeroSection mounted, isEditing:', isEditing);
  }, [isEditing]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLabelClick = () => {
    console.log('Label clicked');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleImageUpload triggered');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    try {
      setIsUploading(true);
      console.log('Starting upload process...');
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `community-pages/${fileName}`;

      console.log('Upload details:', {
        fileExt,
        fileName,
        filePath
      });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      console.log('Upload response:', { uploadError });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      console.log('Public URL:', publicUrl);

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

  const handleJoinCommunity = async () => {
    if (!currentUser) {
      showAuthModal("signup");
      return;
    }

    if (!communityData) {
      toast.error("Community data not available");
      return;
    }

    try {
      if (
        communityData.membershipEnabled &&
        communityData.membershipPrice &&
        communityData.membershipPrice > 0
      ) {
        // Handle paid membership
        const response = await fetch(
          `/api/community/${communityData.slug}/join-paid`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: currentUser.id,
              email: currentUser.email,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to create payment");
        }

        const { clientSecret, stripeAccountId } = await response.json();
        setPaymentClientSecret(clientSecret);
        setShowPaymentModal(true);
      } else {
        // Handle free membership
        const response = await fetch(`/api/community/${communityData.slug}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to join community");
        }

        toast.success("Successfully joined the community!");
        // Redirect to the main community page
        window.location.href = `/community/${communityData.slug}`;
      }
    } catch (error) {
      console.error("Error joining community:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join community"
      );
    }
  };

  const handleButtonClick = () => {
    if (section.content.buttonType === 'join') {
      handleJoinCommunity();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group hero-section-banner",
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
          {(section.content.buttonType === 'join' || section.content.buttonType === 'link') && (
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-100"
              onClick={section.content.buttonType === 'join' ? handleButtonClick : undefined}
              asChild={section.content.buttonType === 'link'}
              disabled={section.content.buttonType === 'join' && communityData?.isMember}
            >
              {section.content.buttonType === 'link' ? (
                <a 
                  href={section.content.ctaLink?.startsWith('http') ? section.content.ctaLink : `https://${section.content.ctaLink || '#'}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {section.content.ctaText || 'Click here'}
                </a>
              ) : (
                <span>
                  {communityData?.isMember && !isEditing
                    ? "You're already a member"
                    : communityData?.membershipEnabled && communityData?.membershipPrice && communityData?.membershipPrice > 0
                      ? `Join for €${communityData.membershipPrice}/month`
                      : 'Join for free'
                  }
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

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
                // Allow closing when clicking outside the banner
                const target = e.target as HTMLElement;
                if (!target.closest('.hero-section-banner')) {
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
                    <div>
                      <div className="h-[100px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <div 
                          className="cursor-pointer w-full h-full flex items-center justify-center"
                          onClick={() => {
                            console.log('Upload area clicked');
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              console.log('File input change event');
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) {
                                console.log('No file selected');
                                return;
                              }

                              console.log('File selected:', {
                                name: file.name,
                                type: file.type,
                                size: file.size
                              });

                              try {
                                setIsUploading(true);
                                console.log('Starting upload process...');
                                const fileExt = file.name.split('.').pop();
                                const fileName = `${uuidv4()}.${fileExt}`;
                                const filePath = `community-pages/${fileName}`;

                                console.log('Upload details:', {
                                  fileExt,
                                  fileName,
                                  filePath
                                });

                                // Upload to Supabase Storage
                                const { error: uploadError } = await supabase.storage
                                  .from('images')
                                  .upload(filePath, file);

                                console.log('Upload response:', { uploadError });

                                if (uploadError) {
                                  throw uploadError;
                                }

                                // Get the public URL
                                const { data: { publicUrl } } = supabase.storage
                                  .from('images')
                                  .getPublicUrl(filePath);
                                
                                console.log('Public URL:', publicUrl);

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
                            input.click();
                          }}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <UploadCloud className="h-8 w-8 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {isUploading ? 'Uploading...' : 'Upload Image'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Max size: 5MB. Supported formats: JPG, PNG, GIF
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Button Type</label>
                    <Select
                      value={section.content.buttonType || 'link'}
                      onValueChange={(value: 'link' | 'join') => {
                        onUpdate({ 
                          ...section.content, 
                          buttonType: value,
                          // Set default text when switching to link type
                          ctaText: value === 'link' ? (section.content.ctaText || 'Click here') : section.content.ctaText
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select button type" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="link">Regular Link</SelectItem>
                        <SelectItem value="join">Join Community</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {section.content.buttonType === 'link' && (
                    <>
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
                    </>
                  )}
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

      {showPaymentModal && paymentClientSecret && communityData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          clientSecret={paymentClientSecret}
          stripeAccountId={communityData.stripeAccountId || null}
          price={communityData.membershipPrice || 0}
          onSuccess={() => {
            setShowPaymentModal(false);
            // Redirect to the main community page instead of reloading
            window.location.href = `/community/${communityData.slug}`;
          }}
          communitySlug={communityData.slug}
        />
      )}
    </div>
  );
} 