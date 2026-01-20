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
import { PreRegistrationPaymentModal } from "@/components/PreRegistrationPaymentModal";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CTASectionProps {
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
  const [isPreRegModalOpen, setIsPreRegModalOpen] = useState(false);
  const [preRegClientSecret, setPreRegClientSecret] = useState<string | null>(null);
  const [preRegStripeAccountId, setPreRegStripeAccountId] = useState<string | null>(null);
  const [preRegOpeningDate, setPreRegOpeningDate] = useState<string | null>(null);
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

    setIsJoining(true);

    try {
      // Check if community is in pre-registration mode
      if (communityData.status === 'pre_registration') {
        const response = await fetch(
          `/api/community/${communityData.slug}/join-pre-registration`,
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
          throw new Error("Failed to initiate pre-registration");
        }

        const { clientSecret, stripeAccountId, openingDate } = await response.json();
        setPreRegClientSecret(clientSecret);
        setPreRegStripeAccountId(stripeAccountId);
        setPreRegOpeningDate(openingDate);
        setIsPreRegModalOpen(true);
      } else if (
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
    } finally {
      setIsJoining(false);
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
      {/* Editor Toolbar - Fluid Movement */}
      {isEditing && (isHovered || isSettingsOpen) && (
        <div className="absolute top-6 right-6 p-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg z-20">
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
              if (open) setIsHovered(false);
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
                if (!target.closest('.cta-section')) setIsSettingsOpen(false);
                if (target.closest('[role="listbox"]')) e.preventDefault();
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Background Style</label>
                  <Select
                    value={section.content.overlayStyle || 'gradient'}
                    onValueChange={(value: 'gradient' | 'dark' | 'none') => {
                      onUpdate({ ...section.content, overlayStyle: value });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-border/50">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl">
                      <SelectItem value="gradient" className="rounded-lg">Purple Gradient</SelectItem>
                      <SelectItem value="dark" className="rounded-lg">Dark</SelectItem>
                      <SelectItem value="none" className="rounded-lg">Light (Muted)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Button Type</label>
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

      {/* Section Content - Fluid Movement CTA */}
      <div className={cn(
        "relative py-20 md:py-28 px-6 overflow-hidden rounded-3xl mx-4 my-4",
        section.content.overlayStyle === 'gradient' || !section.content.overlayStyle
          ? "bg-gradient-to-br from-primary via-secondary to-accent"
          : section.content.overlayStyle === 'dark'
            ? "bg-foreground"
            : "bg-muted"
      )}>
        {/* Animated gradient overlay - only for gradient style */}
        {(section.content.overlayStyle === 'gradient' || !section.content.overlayStyle) && (
          <>
            <div
              className="absolute inset-0 opacity-50 animate-gradient-shift"
              style={{
                background: 'linear-gradient(45deg, hsl(265 65% 60% / 0.6), hsl(275 55% 70% / 0.4), hsl(260 70% 65% / 0.5))',
                backgroundSize: '400% 400%'
              }}
            />
            {/* Decorative circles */}
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          </>
        )}

        <div className={cn(
          "relative z-10 max-w-3xl mx-auto text-center",
          section.content.overlayStyle === 'none' ? "text-foreground" : "text-white"
        )}>
          <h2
            className={cn(
              "font-display text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 outline-none",
              section.content.overlayStyle !== 'none' && "drop-shadow-lg"
            )}
            contentEditable={isEditing}
            onBlur={(e) => handleContentEdit(e, 'title')}
            suppressContentEditableWarning
          >
            {section.content.title || 'Add title'}
          </h2>
          <p
            className={cn(
              "text-lg md:text-xl mb-10 outline-none max-w-xl mx-auto",
              section.content.overlayStyle !== 'none' ? "opacity-90 drop-shadow-md" : "text-muted-foreground"
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
                section.content.overlayStyle === 'none'
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