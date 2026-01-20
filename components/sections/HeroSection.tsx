"use client";

import { Section } from "@/types/page-builder";
import { Button } from "../ui/button";
import Image from "next/image";
import { UploadCloud, GripVertical, Trash, Settings, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { uploadFileToStorage, STORAGE_FOLDERS } from "@/lib/storage-client";
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
import { PreRegistrationPaymentModal } from "@/components/PreRegistrationPaymentModal";
import { useRouter } from "next/navigation";

interface HeroSectionProps {
  section: Section;
  onUpdate: (content: Section['content']) => void;
  onDelete: () => void;
  isEditing?: boolean;
  communityData?: {
    id: string;
    slug: string;
    name: string;
    membershipEnabled?: boolean;
    membershipPrice?: number;
    stripeAccountId?: string | null;
    isMember?: boolean;
    status?: 'active' | 'pre_registration' | 'inactive';
    opening_date?: string | null;
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
  const [isPreRegModalOpen, setIsPreRegModalOpen] = useState(false);
  const [preRegClientSecret, setPreRegClientSecret] = useState('');
  const [preRegStripeAccountId, setPreRegStripeAccountId] = useState('');
  const [preRegOpeningDate, setPreRegOpeningDate] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { user: currentUser } = useAuth();
  const { showAuthModal } = useAuthModal();
  const router = useRouter();

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

      // Upload to B2 Storage via API
      const publicUrl = await uploadFileToStorage(file, STORAGE_FOLDERS.COMMUNITY_PAGES);

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

    // Check if community is in pre-registration mode
    if (communityData.status === 'pre_registration') {
      if (!communityData.membershipEnabled || !communityData.membershipPrice) {
        toast.error('This community requires paid membership for pre-registration');
        return;
      }

      try {
        setIsJoining(true);

        // Call pre-registration API
        const response = await fetch(`/api/community/${communityData.slug}/join-pre-registration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            email: currentUser.email,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to start pre-registration');
        }

        const { clientSecret, stripeAccountId, openingDate } = await response.json();

        // Open pre-registration payment modal
        setPreRegClientSecret(clientSecret);
        setPreRegStripeAccountId(stripeAccountId);
        setPreRegOpeningDate(openingDate);
        setIsPreRegModalOpen(true);

      } catch (error: any) {
        console.error('Pre-registration error:', error);
        toast.error(error.message || 'Failed to start pre-registration');
      } finally {
        setIsJoining(false);
      }
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
        window.location.href = `/${communityData.slug}`;
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
      {/* Section Content - Fluid Movement Hero */}
      <div
        className={cn(
          "relative h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden rounded-3xl mx-4 my-4",
          section.content.backgroundMode === 'none' ? "bg-muted text-foreground" : "text-white"
        )}
        style={section.content.backgroundMode === 'background' ? {
          backgroundColor: section.content.overlayColor || '#7c3aed'
        } : undefined}
      >
        {/* Background Image - show when overlay mode or no mode set */}
        {section.content.imageUrl && section.content.backgroundMode !== 'background' && (
          <Image
            src={section.content.imageUrl}
            alt={section.content.title || ''}
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Overlay gradient - only for overlay mode */}
        {(section.content.backgroundMode === 'overlay' || (!section.content.backgroundMode && section.content.backgroundMode !== 'none')) && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${section.content.overlayColor || '#7c3aed'}ee, ${section.content.overlayColor || '#7c3aed'}66, transparent)`
            }}
          />
        )}

        {/* Content */}
        <div className={cn(
          "relative z-10 text-center max-w-3xl mx-auto px-6",
          section.content.backgroundMode === 'none' && "text-foreground"
        )}>
          <h1
            className={cn(
              "font-display text-4xl md:text-5xl lg:text-6xl font-semibold mb-6 outline-none",
              section.content.backgroundMode !== 'none' && "drop-shadow-lg"
            )}
            contentEditable={isEditing}
            onBlur={(e) => handleContentEdit(e, 'title')}
            suppressContentEditableWarning
          >
            {section.content.title || 'Add title'}
          </h1>
          <p
            className={cn(
              "text-lg md:text-xl lg:text-2xl mb-10 outline-none max-w-2xl mx-auto",
              section.content.backgroundMode !== 'none' ? "opacity-90 drop-shadow-md" : "text-muted-foreground"
            )}
            contentEditable={isEditing}
            onBlur={(e) => handleContentEdit(e, 'subtitle')}
            suppressContentEditableWarning
          >
            {section.content.subtitle || 'Add subtitle'}
          </p>
          {(section.content.buttonType === 'join' || section.content.buttonType === 'link') && (
            <Button
              size="lg"
              className={cn(
                "font-semibold rounded-xl h-14 px-8 text-lg",
                "transition-all duration-300 ease-out",
                "hover:scale-105 hover:shadow-xl shadow-lg",
                section.content.backgroundMode === 'none'
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-white text-primary hover:bg-white/90"
              )}
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
                    : communityData?.status === 'pre_registration'
                      ? communityData?.membershipPrice && communityData?.membershipPrice > 0
                        ? `Pre-Register for €${communityData.membershipPrice}/month`
                        : 'Pre-Register for free'
                      : communityData?.status === 'inactive'
                        ? 'Community Inactive'
                        : communityData?.membershipEnabled && communityData?.membershipPrice && communityData?.membershipPrice > 0
                          ? `Join for €${communityData.membershipPrice}/month`
                          : 'Join for free'
                  }
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Curved bottom edge - only show with colored backgrounds */}
        {section.content.backgroundMode !== 'none' && (
          <svg
            viewBox="0 0 1200 60"
            className="absolute bottom-0 left-0 w-full h-8 md:h-12"
            preserveAspectRatio="none"
            fill="hsl(var(--background))"
          >
            <path d="M0,60 L0,30 Q600,0 1200,30 L1200,60 Z" />
          </svg>
        )}
      </div>

      {/* Editor Toolbar - Fluid Movement */}
      {isEditing && (isHovered || isSettingsOpen) && (
        <div className="absolute top-6 right-6 p-2 flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg z-20">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
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
                className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 rounded-xl border-border/50"
              onInteractOutside={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('.hero-section-banner')) {
                  setIsSettingsOpen(false);
                }
                if (target.closest('[role="listbox"]')) {
                  e.preventDefault();
                }
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Background Image</label>
                  <div className="flex items-center gap-4">
                    {section.content.imageUrl && (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border/50 group">
                        <Image
                          src={section.content.imageUrl}
                          alt="Background"
                          fill
                          className="object-cover"
                        />
                        <button
                          onClick={() => onUpdate({ ...section.content, imageUrl: undefined })}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    )}
                    <div>
                      <div className="h-[100px] border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center hover:border-primary/50 transition-colors">
                        <div
                          className="cursor-pointer w-full h-full flex items-center justify-center"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              try {
                                setIsUploading(true);
                                const publicUrl = await uploadFileToStorage(file, STORAGE_FOLDERS.COMMUNITY_PAGES);
                                onUpdate({ ...section.content, imageUrl: publicUrl });
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
                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {isUploading ? 'Uploading...' : 'Upload Image'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Max size: 5MB. Supported: JPG, PNG, GIF
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Color Mode</label>
                    <Select
                      value={section.content.backgroundMode || 'overlay'}
                      onValueChange={(value: 'background' | 'overlay' | 'none') => {
                        onUpdate({ ...section.content, backgroundMode: value });
                      }}
                    >
                      <SelectTrigger className="rounded-xl border-border/50">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-xl">
                        <SelectItem value="overlay" className="rounded-lg">Overlay (gradient on image)</SelectItem>
                        <SelectItem value="background" className="rounded-lg">Background (solid color)</SelectItem>
                        <SelectItem value="none" className="rounded-lg">None (transparent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {section.content.backgroundMode !== 'none' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { color: '#000000', label: 'Black', bg: 'bg-black' },
                          { color: '#7c3aed', label: 'Purple', bg: 'bg-violet-600' },
                          { color: '#2563eb', label: 'Blue', bg: 'bg-blue-600' },
                          { color: '#059669', label: 'Green', bg: 'bg-emerald-600' },
                          { color: '#dc2626', label: 'Red', bg: 'bg-red-600' },
                          { color: '#d97706', label: 'Orange', bg: 'bg-amber-600' },
                          { color: '#0891b2', label: 'Cyan', bg: 'bg-cyan-600' },
                        ].map((option) => (
                          <button
                            key={option.color}
                            onClick={() => onUpdate({ ...section.content, overlayColor: option.color })}
                            className={cn(
                              "w-8 h-8 rounded-lg transition-all",
                              option.bg,
                              section.content.overlayColor === option.color
                                ? "ring-2 ring-primary ring-offset-2"
                                : "hover:scale-110"
                            )}
                            title={option.label}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={section.content.overlayColor || '#7c3aed'}
                        onChange={(e) => onUpdate({ ...section.content, overlayColor: e.target.value })}
                        className="w-full h-8 rounded-lg cursor-pointer border border-border/50"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Button Type</label>
                    <Select
                      value={section.content.buttonType || 'link'}
                      onValueChange={(value: 'link' | 'join') => {
                        onUpdate({
                          ...section.content,
                          buttonType: value,
                          ctaText: value === 'link' ? (section.content.ctaText || 'Click here') : section.content.ctaText
                        });
                      }}
                    >
                      <SelectTrigger className="rounded-xl border-border/50">
                        <SelectValue placeholder="Select button type" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-xl">
                        <SelectItem value="link" className="rounded-lg">Regular Link</SelectItem>
                        <SelectItem value="join" className="rounded-lg">Join Community</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {section.content.buttonType === 'link' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Button Text</label>
                        <Input
                          value={section.content.ctaText || ''}
                          onChange={(e) => onUpdate({ ...section.content, ctaText: e.target.value })}
                          placeholder="Enter button text"
                          className="rounded-xl border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Button Link</label>
                        <Input
                          value={section.content.ctaLink || ''}
                          onChange={(e) => onUpdate({ ...section.content, ctaLink: e.target.value })}
                          placeholder="Enter button link"
                          className="rounded-xl border-border/50"
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
            className="h-9 w-9 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
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
            window.location.href = `/${communityData.slug}`;
          }}
          communitySlug={communityData.slug}
        />
      )}

      {isPreRegModalOpen && preRegClientSecret && preRegStripeAccountId && communityData && preRegOpeningDate && (
        <PreRegistrationPaymentModal
          isOpen={isPreRegModalOpen}
          onClose={() => setIsPreRegModalOpen(false)}
          clientSecret={preRegClientSecret}
          stripeAccountId={preRegStripeAccountId}
          communitySlug={communityData.slug}
          communityName={communityData.name}
          price={communityData.membershipPrice || 0}
          openingDate={preRegOpeningDate}
          onSuccess={() => {
            setIsPreRegModalOpen(false);
            toast.success('Pre-registration confirmed!');
            router.push(`/${communityData.slug}`);
          }}
        />
      )}
    </div>
  );
}