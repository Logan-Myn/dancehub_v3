"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Squares2X2Icon,
  Cog6ToothIcon,
  CreditCardIcon,
  TagIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import {
  DollarSign,
  ExternalLink,
  Loader2,
  Plus,
  X,
  MessageCircle,
  Lock,
  Users,
  BarChart3,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_ICONS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThreadCategory } from "@/types/community";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableCategory } from "./DraggableCategory";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Import the custom Stripe onboarding wizard
import { OnboardingWizard } from "./stripe-onboarding/OnboardingWizard";

interface CustomLink {
  title: string;
  url: string;
}

interface DashboardStats {
  totalMembers: number;
  monthlyRevenue: number;
  totalThreads: number;
  activeMembers: number;
  membershipGrowth: number;
  revenueGrowth: number;
}

interface RevenueData {
  monthlyRevenue: number;
}

interface CommunityMember {
  id: string;
  displayName: string;
  email: string;
  imageUrl: string;
  joinedAt: string;
  status: "active" | "inactive";
  lastActive?: string;
}

interface StripeRequirement {
  code: string;
  message: string;
}

interface StripeRequirements {
  currentlyDue: StripeRequirement[];
  pastDue: StripeRequirement[];
  eventuallyDue: StripeRequirement[];
  currentDeadline?: number;
  disabledReason?: string;
}

interface StripeAccountStatus {
  isEnabled: boolean;
  needsSetup: boolean;
  accountId?: string;
  details?: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: StripeRequirements;
    businessType?: string;
    capabilities?: Record<string, string>;
    payoutSchedule?: any;
    defaultCurrency?: string;
    email?: string;
  };
}

interface PayoutData {
  balance: {
    available: number;
    pending: number;
    currency: string;
  };
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    arrivalDate: string;
    status: string;
    type: string;
    bankAccount: any;
  }>;
}

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communitySlug: string;
  communityName: string;
  communityDescription: string;
  imageUrl: string;
  onImageUpdate: (newImageUrl: string) => void;
  onCommunityUpdate: (updates: any) => void;
  customLinks: CustomLink[];
  onCustomLinksUpdate: (newLinks: CustomLink[]) => void;
  stripeAccountId: string | null;
  threadCategories: ThreadCategory[];
  onThreadCategoriesUpdate: (categories: ThreadCategory[]) => void;
  communityStats?: DashboardStats;
}

const navigationCategories = [
  { id: "dashboard", name: "Dashboard", icon: Squares2X2Icon },
  { id: "general", name: "General", icon: Cog6ToothIcon },
  { id: "members", name: "Members", icon: UserGroupIcon },
  { id: "subscriptions", name: "Subscriptions", icon: CreditCardIcon },
  { id: "thread_categories", name: "Thread Categories", icon: TagIcon },
];

const formatUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};

export default function CommunitySettingsModal({
  isOpen,
  onClose,
  communityId,
  communitySlug,
  communityName,
  communityDescription,
  imageUrl,
  customLinks,
  stripeAccountId,
  threadCategories,
  onImageUpdate,
  onCommunityUpdate,
  onCustomLinksUpdate,
  onThreadCategoriesUpdate,
}: CommunitySettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState("dashboard");
  const [name, setName] = useState(communityName);
  const [description, setDescription] = useState(communityDescription);
  const [isUploading, setIsUploading] = useState(false);
  const [links, setLinks] = useState(customLinks);
  const [categories, setCategories] = useState(threadCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIconType, setNewCategoryIconType] = useState("");
  const [isCreatorOnly, setIsCreatorOnly] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] =
    useState<StripeAccountStatus>({
      isEnabled: false,
      needsSetup: true,
      accountId: stripeAccountId || undefined,
      details: undefined,
    });
  const [isLoadingStripeStatus, setIsLoadingStripeStatus] = useState(false);
  const [isMembershipEnabled, setIsMembershipEnabled] = useState(false);
  const [price, setPrice] = useState(0);
  const [localCommunityStats, setLocalCommunityStats] =
    useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData>({
    monthlyRevenue: 0,
  });
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);
  const [bankAccount, setBankAccount] = useState<{
    iban?: string;
    last4?: string;
    bank_name?: string;
  } | null>(null);
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [isUpdatingIban, setIsUpdatingIban] = useState(false);
  const [refreshMembersTrigger, setRefreshMembersTrigger] = useState(0);
  
  // Custom Stripe onboarding state
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);
  
  const supabase = createClient();
  const { user } = useAuth();

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Fetch revenue data
  useEffect(() => {
    async function fetchRevenueData() {
      if (activeCategory === "dashboard" && stripeAccountId) {
        try {
          const response = await fetch(
            `/api/community/${communitySlug}/stripe-revenue`
          );
          if (!response.ok) throw new Error("Failed to fetch revenue data");
          const data = await response.json();
          setRevenueData(data);
        } catch (error) {
          console.error("Error fetching revenue data:", error);
          toast.error("Failed to fetch revenue data");
        }
      }
    }

    if (isOpen) {
      fetchRevenueData();
    }
  }, [communitySlug, activeCategory, isOpen, stripeAccountId]);

  // Add effect to fetch initial membership state
  useEffect(() => {
    async function fetchMembershipState() {
      try {
        const response = await fetch(`/api/community/${communitySlug}`);
        if (!response.ok) throw new Error("Failed to fetch community data");

        const data = await response.json();

        // Only set membership data if Stripe is connected
        if (stripeAccountId) {
          const hasPrice = data.membership_price && data.membership_price > 0;
          setIsMembershipEnabled(hasPrice || data.membership_enabled || false);
          setPrice(data.membership_price || 0);
        } else {
          setIsMembershipEnabled(false);
          setPrice(0);
        }
      } catch (error) {
        console.error("Error fetching membership state:", error);
      }
    }

    if (isOpen) {
      fetchMembershipState();
    }
  }, [communitySlug, isOpen, stripeAccountId]);

  // Fetch Stripe account status when component mounts or stripeAccountId changes
  useEffect(() => {
    async function fetchStripeStatus() {
      setIsLoadingStripeStatus(true);

      if (!stripeAccountId) {
        setStripeAccountStatus({
          isEnabled: false,
          needsSetup: true,
          accountId: undefined,
          details: undefined,
        });
        setIsLoadingStripeStatus(false);
        return;
      }

      try {
        const url = `/api/stripe/account-status/${stripeAccountId}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch Stripe status: ${response.status}`);
        }

        const data = await response.json();
        const newStatus = {
          isEnabled: data.chargesEnabled && data.payoutsEnabled,
          needsSetup: !data.detailsSubmitted,
          accountId: stripeAccountId,
          details: {
            chargesEnabled: data.chargesEnabled,
            payoutsEnabled: data.payoutsEnabled,
            detailsSubmitted: data.detailsSubmitted,
            requirements: data.requirements,
            businessType: data.businessType,
            capabilities: data.capabilities,
            payoutSchedule: data.payoutSchedule,
            defaultCurrency: data.defaultCurrency,
            email: data.email,
          },
        };

        setStripeAccountStatus(newStatus);
      } catch (error) {
        console.error("Error in fetchStripeStatus:", error);
        setStripeAccountStatus({
          isEnabled: false,
          needsSetup: true,
          accountId: stripeAccountId,
          details: undefined,
        });
      } finally {
        setIsLoadingStripeStatus(false);
      }
    }

    if (isOpen) {
      fetchStripeStatus();
    }
  }, [stripeAccountId, isOpen]);

  // Add effect to refetch status after Stripe connection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const setup = urlParams.get("setup");

    if (setup === "complete" && stripeAccountId) {
      const fetchStatus = async () => {
        setIsLoadingStripeStatus(true);
        try {
          const response = await fetch(
            `/api/stripe/account-status/${stripeAccountId}`
          );
          if (!response.ok) throw new Error("Failed to fetch status");

          const data = await response.json();

          setStripeAccountStatus({
            isEnabled: data.chargesEnabled && data.payoutsEnabled,
            needsSetup: !data.detailsSubmitted,
            accountId: stripeAccountId,
            details: data,
          });
        } catch (error) {
          console.error("Error refreshing Stripe status:", error);
        } finally {
          setIsLoadingStripeStatus(false);
        }
      };

      fetchStatus();
    }
  }, [stripeAccountId]);

  // Fetch community stats
  useEffect(() => {
    async function fetchCommunityStats() {
      if (activeCategory === "dashboard") {
        try {
          console.log("Fetching community stats for:", communitySlug);
          const response = await fetch(`/api/community/${communitySlug}/stats`);

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error response from stats API:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });
            throw new Error("Failed to fetch community stats");
          }

          const data = await response.json();
          console.log("Received community stats:", data);
          setLocalCommunityStats(data);
        } catch (error) {
          console.error("Error fetching community stats:", error);
          toast.error("Failed to fetch community stats");
        }
      }
    }

    if (isOpen) {
      fetchCommunityStats();
    }
  }, [communitySlug, activeCategory, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setRefreshMembersTrigger((prev) => prev + 1);
    }
  }, [isOpen]);

  useEffect(() => {
    async function fetchMembers() {
      if (activeCategory === "members") {
        setIsLoadingMembers(true);
        try {
          // Get community ID first
          const { data: communityData, error: communityError } = await supabase
            .from("communities")
            .select("id")
            .eq("slug", communitySlug)
            .single();

          if (communityError || !communityData) {
            throw new Error("Community not found");
          }

          // Get members with profiles
          const { data: membersData, error: membersError } = await supabase
            .from("community_members_with_profiles")
            .select("*")
            .eq("community_id", communityData.id);

          if (membersError) {
            throw membersError;
          }

          // Format members data
          const formattedMembers = membersData.map((member) => ({
            id: member.id,
            displayName: member.full_name || "Anonymous",
            email: member.email || "",
            imageUrl: member.avatar_url || "",
            joinedAt: member.joined_at,
            status: member.status || "active",
            lastActive: member.last_active,
            user_id: member.user_id,
          }));

          setMembers(formattedMembers);
        } catch (error) {
          console.error("Error fetching members:", error);
          toast.error("Failed to fetch members");
        } finally {
          setIsLoadingMembers(false);
        }
      }
    }

    fetchMembers();
  }, [communitySlug, activeCategory, refreshMembersTrigger]);

  // Fetch payout data
  useEffect(() => {
    async function fetchPayoutData() {
      if (
        activeCategory === "subscriptions" &&
        stripeAccountId &&
        stripeAccountStatus.isEnabled
      ) {
        setIsLoadingPayouts(true);
        try {
          const response = await fetch(
            `/api/community/${communitySlug}/payouts`
          );
          if (!response.ok) throw new Error("Failed to fetch payout data");
          const data = await response.json();
          setPayoutData(data);
        } catch (error) {
          console.error("Error fetching payout data:", error);
          toast.error("Failed to fetch payout data");
        } finally {
          setIsLoadingPayouts(false);
        }
      }
    }

    fetchPayoutData();
  }, [
    activeCategory,
    communitySlug,
    stripeAccountId,
    stripeAccountStatus.isEnabled,
  ]);

  // Add effect to fetch bank account details
  useEffect(() => {
    async function fetchBankAccount() {
      if (
        activeCategory === "subscriptions" &&
        stripeAccountId &&
        stripeAccountStatus.isEnabled
      ) {
        setIsLoadingBank(true);
        try {
          const response = await fetch(
            `/api/stripe/bank-account/${stripeAccountId}`
          );
          if (!response.ok) throw new Error("Failed to fetch bank account");
          const data = await response.json();
          setBankAccount(data);
          if (data.iban) {
            setIbanInput(data.iban);
          }
        } catch (error) {
          console.error("Error fetching bank account:", error);
          toast.error("Failed to fetch bank account details");
        } finally {
          setIsLoadingBank(false);
        }
      }
    }

    fetchBankAccount();
  }, [activeCategory, stripeAccountId, stripeAccountStatus.isEnabled]);

  const handleUpdateIban = async () => {
    if (!stripeAccountId) return;

    setIsUpdatingIban(true);
    try {
      const response = await fetch(
        `/api/stripe/bank-account/${stripeAccountId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to access Stripe dashboard");
      }

      const { url } = await response.json();
      // Redirect to Stripe dashboard
      window.location.href = url;
    } catch (error: any) {
      console.error("Error accessing Stripe dashboard:", error);
      toast.error(error.message || "Failed to access Stripe dashboard");
    } finally {
      setIsUpdatingIban(false);
    }
  };

  const handleAddLink = () => {
    setLinks([...links, { title: "", url: "" }]);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_, i: number) => i !== index);
    setLinks(newLinks);
  };

  const handleLinkChange = (
    index: number,
    field: "title" | "url",
    value: string
  ) => {
    const newLinks = links.map((link: CustomLink, i: number) => {
      if (i === index) {
        if (field === "url") {
          return { ...link, [field]: formatUrl(value) };
        }
        return { ...link, [field]: value };
      }
      return link;
    });
    setLinks(newLinks);
  };

  const handleSaveChanges = useCallback(async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Saving your changes...", {
        duration: Infinity, // The toast will remain until we dismiss it
      });

      // Generate new slug from name
      const newSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const requestBody = {
        name,
        description,
        imageUrl,
        customLinks: links,
        slug: newSlug, // Add the new slug to the update
      };

      console.log("Updating community with slug:", communitySlug);
      console.log("Generated new slug:", newSlug);
      console.log("Request body being sent:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`/api/community/${communitySlug}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Log the server's error response if possible
        let errorData = { message: "Failed to update community" };
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if response is not JSON
        }
        console.error("Server responded with an error:", response.status, errorData);
        throw new Error(errorData.message || "Failed to update community");
      }

      const data = await response.json();

      // Update all the data through parent component
      onCommunityUpdate({
        name: data.data.name,
        description: data.data.description,
        slug: data.data.slug,
      });
      onImageUpdate(data.data.imageUrl);
      onCustomLinksUpdate(data.data.customLinks);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Your changes have been saved successfully!", {
        duration: 3000,
        icon: "✅",
      });

      // If the slug has changed, redirect to the new URL
      if (newSlug !== communitySlug) {
        window.location.href = `/${newSlug}`;
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes. Please try again.", {
        duration: 3000,
        icon: "❌",
      });
    }
  }, [
    name,
    description,
    imageUrl,
    links,
    communitySlug,
    onCommunityUpdate,
    onImageUpdate,
    onCustomLinksUpdate,
  ]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file name with community folder
      const fileExt = file.name.split(".").pop();
      const filePath = `${communityId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("community-images")
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      // Update community image URL
      const { error: updateError } = await supabase
        .from("communities")
        .update({ image_url: urlData.publicUrl })
        .eq("id", communityId);

      if (updateError) {
        throw updateError;
      }

      onImageUpdate(urlData.publicUrl);
      toast.success("Community image updated successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setIsConnectingStripe(true);
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          communityId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect Stripe");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      toast.error("Failed to connect Stripe");
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleCompleteVerification = async () => {
    try {
      const response = await fetch("/api/stripe/create-update-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: stripeAccountId,
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create update link");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating update link:", error);
      toast.error("Failed to open verification form");
    }
  };

  // Custom Stripe onboarding handlers
  const handleStartCustomOnboarding = () => {
    setIsOnboardingWizardOpen(true);
  };

  const handleOnboardingComplete = async (accountId: string) => {
    try {
      // Update the community with the new Stripe account ID
      onCommunityUpdate({ stripe_account_id: accountId });
      
      // Refetch Stripe status to get the latest information
      const response = await fetch(`/api/stripe/account-status/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setStripeAccountStatus({
          isEnabled: data.chargesEnabled && data.payoutsEnabled,
          needsSetup: !data.detailsSubmitted,
          accountId: accountId,
          details: data,
        });
      }
      
      toast.success("Stripe account setup completed successfully!");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Setup completed but failed to update status");
    }
  };

  const handlePriceUpdate = async () => {
    try {
      const response = await fetch(
        `/api/community/${communitySlug}/update-price`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            price,
            enabled: isMembershipEnabled,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Server error details:", data);
        throw new Error(data.error || "Failed to update price");
      }

      // Update local state
      onCommunityUpdate({
        membership_enabled: isMembershipEnabled,
        membership_price: price,
        stripe_price_id: data.stripe_price_id,
      });

      toast.success("Price updated successfully");
    } catch (error) {
      console.error("Error updating price:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update price"
      );
    }
  };

  const handleAddCategory = () => {
    const newCategory: ThreadCategory = {
      id: crypto.randomUUID(),
      name: "",
      iconType:
        CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)].label,
      color: "#000000",
    };
    setCategories([...categories, newCategory]);
  };

  const handleRemoveCategory = (id: string) => {
    setCategories(categories.filter((cat) => cat.id !== id));
  };

  const handleCategoryChange = (
    id: string,
    field: keyof ThreadCategory,
    value: string | boolean
  ) => {
    setCategories(
      categories.map((cat) =>
        cat.id === id ? { ...cat, [field]: value } : cat
      )
    );
  };

  const handleSaveCategories = async () => {
    try {
      const response = await fetch(
        `/api/community/${communitySlug}/categories`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ categories }),
        }
      );

      if (!response.ok) throw new Error("Failed to update categories");

      onThreadCategoriesUpdate(categories);
      toast.success("Categories updated successfully");
    } catch (error) {
      console.error("Error updating categories:", error);
      toast.error("Failed to update categories");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setRefreshMembersTrigger((prev) => prev + 1);
      toast.success("Member removed successfully");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const renderSubscriptions = () => (
    <div className="space-y-6">
      {/* Stripe connection status - only show if setup is incomplete */}
      {(!stripeAccountId || !stripeAccountStatus.isEnabled) && renderStripeConnectionStatus()}

      {/* Membership settings */}
      {renderMembershipSettings()}

      {/* Payout management */}
      {renderPayoutManagement()}
    </div>
  );

  const renderStripeConnectionStatus = () => (
    <div className="space-y-6">
      {/* Custom Onboarding Option */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="text-center space-y-4">
          <div>
            <h4 className="font-medium text-blue-900 text-lg">Complete Stripe Setup</h4>
            <p className="text-sm text-blue-700 mt-2">
              To enable paid memberships, you'll need to complete Stripe onboarding. This secure process requires business information, identity verification, and bank details to comply with financial regulations and anti-fraud requirements. Our guided wizard keeps you in your community throughout the setup.
            </p>
          </div>
          <Button
            onClick={handleStartCustomOnboarding}
            className="w-full max-w-sm bg-blue-600 hover:bg-blue-700"
          >
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Start Stripe Setup
          </Button>
        </div>
      </div>
    </div>
  );

  const renderMembershipSettings = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Membership Settings</h3>
        {stripeAccountStatus.isEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Stripe Dashboard
          </Button>
        )}
      </div>

      {/* Stripe Requirements Alert */}
      {stripeAccountId && !stripeAccountStatus.isEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Complete Stripe Setup Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to complete your Stripe account setup to enable subscriptions and receive payments. 
                  This includes providing required business information and verification documents.
                </p>
                {stripeAccountStatus.details?.requirements && (
                  <div className="mt-2">
                    {stripeAccountStatus.details.requirements.currentlyDue.length > 0 && (
                      <p className="font-medium">
                        {stripeAccountStatus.details.requirements.currentlyDue.length} requirement(s) currently due
                      </p>
                    )}
                    {stripeAccountStatus.details.requirements.pastDue.length > 0 && (
                      <p className="font-medium text-red-600">
                        {stripeAccountStatus.details.requirements.pastDue.length} requirement(s) past due
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompleteVerification}
                  className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                >
                  Complete Stripe Setup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Paid Membership</h4>
            <p className="text-sm text-gray-500">
              Enable paid membership for your community
            </p>
          </div>
          <Switch
            checked={isMembershipEnabled}
            onCheckedChange={setIsMembershipEnabled}
            disabled={!stripeAccountStatus.isEnabled}
          />
        </div>

        {/* New Promotional Period Settings */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-blue-800">First Month Free Promotion</h4>
              <p className="text-sm text-blue-700 mt-1">
                New communities automatically get 0% platform fees for the first 30 days after creation. 
                This helps you get started without any platform costs while you build your community.
              </p>
              <div className="mt-3 text-xs text-blue-600">
                <p><strong>How it works:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Members who join within 30 days of community creation pay 0% platform fees</li>
                  <li>After 30 days, standard tiered pricing applies (8% → 6% → 4% based on member count)</li>
                  <li>Existing promotional members continue at 0% until their individual 30-day period ends</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {isMembershipEnabled && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Monthly Membership Price
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">€</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Set the monthly price for your community membership
              </p>
            </div>

            <Button onClick={handlePriceUpdate} className="w-full">
              Update Membership Price
            </Button>
          </div>
        )}

        {!isMembershipEnabled && (
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-sm text-gray-600">
              Your community is currently free to join. Enable paid membership
              to start monetizing your community.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPayoutManagement = () => {
    if (!stripeAccountStatus.isEnabled) {
      return null; // Don't show payout/bank details if Stripe isn't enabled
    }

    return (
      <div className="pt-6 border-t">
        {/* Payout Management Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Payout Management
          </h3>
          {isLoadingPayouts ? (
            <div className="mt-2 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : payoutData ? (
            <div className="space-y-6">
              {/* Current Balance */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                  Current Balance
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(payoutData.balance.available, payoutData.balance.currency)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(payoutData.balance.pending, payoutData.balance.currency)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  </div>
                </div>
              </div>

              {/* Recent Payouts */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                  Recent Payouts
                </h4>
                <div className="space-y-4">
                  {payoutData.payouts.length > 0 ? (
                    payoutData.payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="bg-white p-4 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(payout.amount, payout.currency)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(payout.arrivalDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payout.status === "paid"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : payout.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {payout.status}
                          </span>
                        </div>
                        {payout.bankAccount && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            To: •••• {payout.bankAccount.last4}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No recent payouts
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No payout information available yet.
            </p>
          )}
        </div>

        {/* Bank Account Details Section */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Bank Account Details
          </h3>
          {isLoadingBank ? (
            <div className="mt-2 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : bankAccount ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Bank Name: {bankAccount.bank_name || "N/A"}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Account Ending In: **** {bankAccount.last4 || "N/A"}
              </p>
              <Button
                variant="outline"
                onClick={handleUpdateIban}
                disabled={isUpdatingIban}
                className="mt-2"
              >
                {isUpdatingIban ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Manage Bank Account
              </Button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                To update your bank account details, you&apos;ll be
                redirected to your Stripe Express dashboard.
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No bank account information found. Please add your
                bank account details via Stripe.
              </p>
              <Button
                variant="default"
                onClick={handleUpdateIban}
                disabled={isUpdatingIban}
                className="mt-2"
              >
                {isUpdatingIban ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Manage Bank Account
              </Button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You&apos;ll be redirected to your Stripe Express
                dashboard to manage your bank account.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderThreadCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Thread Categories</h3>
        <Button onClick={handleAddCategory} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((cat) => cat.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {categories.map((category) => (
              <DraggableCategory
                key={category.id}
                category={category}
                onRemove={handleRemoveCategory}
                onChange={handleCategoryChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {categories.length > 0 && (
        <Button onClick={handleSaveCategories} className="w-full">
          Save Categories
        </Button>
      )}

      {categories.length === 0 && (
        <p className="text-sm text-gray-500 text-center">
          No categories yet. Add some to help organize threads in your
          community.
        </p>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Members</h3>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">
            {localCommunityStats?.totalMembers || 0}
          </p>
          <p className="text-sm text-green-600">
            <TrendingUp className="h-4 w-4 inline mr-1" />+
            {localCommunityStats?.membershipGrowth || 0}% this month
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">
              Monthly Revenue
            </h3>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">
            €{revenueData.monthlyRevenue.toFixed(2)}
          </p>
          <p className="text-sm text-green-600">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            {(localCommunityStats?.revenueGrowth ?? 0) >= 0 ? "+" : ""}
            {localCommunityStats?.revenueGrowth ?? 0}% this month
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Threads</h3>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">
            {localCommunityStats?.totalThreads || 0}
          </p>
          <p className="text-sm text-gray-500">Across all categories</p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">
              Active Members
            </h3>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">
            {localCommunityStats?.activeMembers || 0}
          </p>
          <p className="text-sm text-gray-500">Current active memberships</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => setActiveCategory("subscriptions")}
            className="w-full"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Manage Subscriptions
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveCategory("members")}
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            View Members
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderMembers = () => (
    <div>

      {isLoadingMembers ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="mt-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={member.imageUrl}
                            alt={member.displayName}
                          />
                          <AvatarFallback>
                            {member.displayName[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.displayName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.lastActive
                      ? new Date(member.lastActive).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Transition.Root show={isOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-10" onClose={onClose}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-5xl">
                  <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex h-[80vh]">
                    {/* Sidebar */}
                    <div className="w-1/4 bg-gray-100 border-r border-gray-200 overflow-y-auto">
                      <div className="py-6 px-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800">
                          {communityName}
                        </h2>
                        <h3 className="text-sm text-gray-500 mt-1">
                          Community settings
                        </h3>
                      </div>
                      <nav className="mt-6 px-2">
                        {navigationCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`flex items-center w-full text-left py-2 px-4 rounded-md mb-1 ${
                              activeCategory === category.id
                                ? "bg-gray-200 text-gray-900 font-medium"
                                : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                            }`}
                          >
                            <category.icon
                              className="h-5 w-5 mr-3"
                              aria-hidden="true"
                            />
                            {category.name}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Main content */}
                    <div className="w-3/4 p-6 overflow-y-auto">
                      <h2 className="text-2xl font-semibold mb-4">
                        {
                          navigationCategories.find(
                            (c) => c.id === activeCategory
                          )?.name
                        }
                      </h2>

                      {activeCategory === "general" && (
                        <div className="space-y-6">
                          {/* Community Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Community name
                            </label>
                            <Input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="mt-1"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <Textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              rows={4}
                              className="mt-1"
                              placeholder="Tell people what your community is about..."
                            />
                          </div>

                          {/* Cover Image */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Community Cover Image
                            </label>
                            <div className="mt-2">
                              <div className="w-1/2 mx-auto">
                                <div className="relative w-full h-40 mb-4">
                                  <img
                                    src={imageUrl || "/placeholder.svg"}
                                    alt="Community preview"
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                  <label
                                    htmlFor="community-image"
                                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    {isUploading ? (
                                      <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                      <span>Change Image</span>
                                    )}
                                  </label>
                                  <input
                                    type="file"
                                    id="community-image"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Custom Links Section */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Custom Links
                            </label>
                            <div className="space-y-3">
                              {links.map((link, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    placeholder="Link Title (e.g., Instagram)"
                                    value={link.title}
                                    onChange={(e) =>
                                      handleLinkChange(
                                        index,
                                        "title",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1"
                                  />
                                  <Input
                                    placeholder="URL (e.g., instagram.com/your-profile)"
                                    value={link.url}
                                    onChange={(e) =>
                                      handleLinkChange(
                                        index,
                                        "url",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1"
                                  />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleRemoveLink(index)}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddLink}
                                className="w-full"
                              >
                                Add Link
                              </Button>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              Add useful links for your community members (e.g.,
                              social media profiles, website)
                            </p>
                          </div>

                          <Button
                            onClick={handleSaveChanges}
                            className="bg-black text-white hover:bg-gray-800"
                          >
                            Save Changes
                          </Button>
                        </div>
                      )}

                      {activeCategory === "subscriptions" &&
                        renderSubscriptions()}

                      {activeCategory === "thread_categories" &&
                        renderThreadCategories()}

                      {activeCategory === "dashboard" && renderDashboard()}

                      {activeCategory === "members" && renderMembers()}

                      {/* Add other category content here */}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Custom Stripe Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isOnboardingWizardOpen}
        onClose={() => setIsOnboardingWizardOpen(false)}
        communityId={communityId}
        communitySlug={communitySlug}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}
