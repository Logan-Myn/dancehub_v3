"use client";

import { Section } from "@/types/page-builder";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import toast from "react-hot-toast";

interface CTASectionProps {
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

export default function CTASection({ 
  section, 
  onUpdate, 
  onDelete,
  isEditing = false,
  communityData
}: CTASectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const { showAuthModal } = useAuthModal();

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

        // Refresh the page to update all UI states
        window.location.reload();
        toast.success("Successfully joined the community!");
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

  // Initialize buttonType and default values if not set
  useEffect(() => {
    if (!section.content.buttonType) {
      onUpdate({
        ...section.content,
        buttonType: 'link',
        ctaText: 'Click here',
        ctaLink: ''
      });
    }
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group cta-section",
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
                if (!target.closest('.cta-section')) {
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
                  <label className="text-sm font-medium">Button Type</label>
                  <Select
                    value={section.content.buttonType || 'link'}
                    onValueChange={(value: 'link' | 'join') => {
                      onUpdate({ 
                        ...section.content, 
                        buttonType: value,
                        ...(value === 'link' && !section.content.ctaText && { ctaText: 'Click here' }),
                        ...(value === 'link' && !section.content.ctaLink && { ctaLink: '' })
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

      {/* Section Content */}
      <div className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl font-bold mb-4 outline-none"
            contentEditable={isEditing}
            onBlur={(e) => handleContentEdit(e, 'title')}
            suppressContentEditableWarning
          >
            {section.content.title || 'Add title'}
          </h2>
          <p
            className="text-xl text-gray-600 mb-8 outline-none"
            contentEditable={isEditing}
            onBlur={(e) => handleContentEdit(e, 'subtitle')}
            suppressContentEditableWarning
          >
            {section.content.subtitle || 'Add subtitle'}
          </p>
          {(section.content.buttonType === 'join' || section.content.buttonType === 'link') && (
            <Button
              size="lg"
              className="bg-black text-white hover:bg-gray-800"
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

      {showPaymentModal && paymentClientSecret && communityData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          clientSecret={paymentClientSecret}
          stripeAccountId={communityData.stripeAccountId || null}
          price={communityData.membershipPrice || 0}
          onSuccess={() => {
            setShowPaymentModal(false);
            // Refresh the page to update all UI states
            window.location.reload();
            toast.success("Successfully joined the community!");
          }}
          communitySlug={communityData.slug}
        />
      )}
    </div>
  );
} 