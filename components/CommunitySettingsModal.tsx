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
import { uploadFileToStorage, STORAGE_FOLDERS } from "@/lib/storage-client";
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
  const [showIbanUpdateForm, setShowIbanUpdateForm] = useState(false);
  const [newIban, setNewIban] = useState('');
  const [newAccountHolderName, setNewAccountHolderName] = useState('');
  const [refreshMembersTrigger, setRefreshMembersTrigger] = useState(0);
  
  // Custom Stripe onboarding state
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);

  // Pre-registration state
  const [communityStatus, setCommunityStatus] = useState<'active' | 'pre_registration' | 'inactive'>('active');
  const [openingDate, setOpeningDate] = useState<string>('');
  const [canChangeOpeningDate, setCanChangeOpeningDate] = useState(true);

  const { user, session } = useAuth();

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Fetch revenue data
  useEffect(() => {
    async function fetchRevenueData() {
      // Only fetch revenue if Stripe account is fully enabled
      if (activeCategory === "dashboard" && stripeAccountId && stripeAccountStatus.isEnabled) {
        try {
          const response = await fetch(
            `/api/community/${communitySlug}/stripe-revenue`
          );
          if (!response.ok) throw new Error("Failed to fetch revenue data");
          const data = await response.json();
          setRevenueData(data);
        } catch (error) {
          console.error("Error fetching revenue data:", error);
          // Don't show error toast for revenue - it's not critical
        }
      }
    }

    if (isOpen) {
      fetchRevenueData();
    }
  }, [communitySlug, activeCategory, isOpen, stripeAccountId, stripeAccountStatus.isEnabled]);

  // Add effect to fetch initial membership state
  useEffect(() => {
    async function fetchMembershipState() {
      try {
        const response = await fetch(`/api/community/${communitySlug}`);
        if (!response.ok) throw new Error("Failed to fetch community data");

        const data = await response.json();

        // Set membership data based on database values
        setIsMembershipEnabled(data.membership_enabled || false);
        setPrice(data.membership_price || 0);

        // Set pre-registration data
        setCommunityStatus(data.status || 'active');
        setOpeningDate(data.opening_date || '');
        setCanChangeOpeningDate(data.can_change_opening_date ?? true);
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
          const response = await fetch(`/api/community/${communitySlug}/members`);

          if (!response.ok) {
            throw new Error("Failed to fetch members");
          }

          const data = await response.json();
          setMembers(data.members || []);
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

      const { url, requiresOnboarding, accountType, message } = await response.json();
      
      if (requiresOnboarding) {
        toast.success("Completing Stripe setup first, then you can manage your bank account");
      } else if (message) {
        toast.success(message);
      } else if (accountType === 'custom') {
        toast.success("Opening Stripe Dashboard to manage your bank account");
      }
      
      // Redirect to appropriate Stripe interface
      window.location.href = url;
    } catch (error: any) {
      console.error("Error accessing Stripe dashboard:", error);
      toast.error(error.message || "Failed to access Stripe dashboard");
    } finally {
      setIsUpdatingIban(false);
    }
  };

  const handleSubmitIbanUpdate = async () => {
    if (!stripeAccountId || !newIban || !newAccountHolderName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!session) {
      toast.error("You must be logged in to update bank account");
      return;
    }

    setIsUpdatingIban(true);
    try {
      const response = await fetch(
        `/api/stripe/bank-account/${stripeAccountId}/update-iban`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            iban: newIban,
            accountHolderName: newAccountHolderName,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update bank account");
      }

      const { bankAccount, message } = await response.json();
      
      // Update local state with new bank account info
      setBankAccount({
        last4: bankAccount.last4,
        bank_name: "Updated",
      });
      
      // Clear form and close
      setShowIbanUpdateForm(false);
      setNewIban('');
      setNewAccountHolderName('');
      
      toast.success(message || "Bank account updated successfully!");
    } catch (error: any) {
      console.error("Error updating IBAN:", error);
      toast.error(error.message || "Failed to update bank account");
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
      // Validation for pre-registration
      if (communityStatus === 'pre_registration') {
        if (!openingDate) {
          toast.error('Opening date is required for pre-registration mode');
          return;
        }

        const openingDateTime = new Date(openingDate);
        const now = new Date();

        if (openingDateTime <= now) {
          toast.error('Opening date must be in the future');
          return;
        }

        // Check if more than 1 month in future (optional restriction)
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

        if (openingDateTime > oneMonthFromNow) {
          const confirm = window.confirm(
            'Opening date is more than 1 month away. Are you sure you want to set this date?'
          );
          if (!confirm) return;
        }
      }

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
        status: communityStatus,
        opening_date: communityStatus === 'pre_registration' ? openingDate : null,
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
    communityStatus,
    openingDate,
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
      // Upload to B2 Storage via API
      const publicUrl = await uploadFileToStorage(file, STORAGE_FOLDERS.COMMUNITY_IMAGES);

      // Update community image URL via API
      const response = await fetch(`/api/community/${communitySlug}/update-image`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to update community image");
      }

      onImageUpdate(publicUrl);
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
      // Update the community with the new Stripe account ID (use camelCase to match community state)
      onCommunityUpdate({ stripeAccountId: accountId });
      
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

      // Update local state in the parent component
      onCommunityUpdate({
        membership_enabled: isMembershipEnabled,
        membership_price: price,
        stripe_price_id: data.stripe_price_id,
      });

      toast.success("Membership settings updated successfully");
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
      const response = await fetch(`/api/community/${communitySlug}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

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
      {/* Custom Onboarding Option - Fluid Movement style */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
        <div className="text-center space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <CreditCardIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h4 className="font-display text-xl font-semibold text-foreground">Complete Stripe Setup</h4>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
              To enable paid memberships, you'll need to complete Stripe onboarding. This secure process requires business information, identity verification, and bank details.
            </p>
          </div>
          <Button
            onClick={handleStartCustomOnboarding}
            className="w-full max-w-sm h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            <CreditCardIcon className="mr-2 h-5 w-5" />
            Start Stripe Setup
          </Button>
        </div>
      </div>
    </div>
  );

  const renderMembershipSettings = () => (
    <div className="space-y-6">
      {/* Stripe Requirements Alert - Fluid Movement style */}
      {stripeAccountId && !stripeAccountStatus.isEnabled && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-display text-base font-semibold text-yellow-800 dark:text-yellow-200">
                Complete Stripe Setup Required
              </h3>
              <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                Complete your Stripe account setup to enable subscriptions and receive payments.
              </p>
              {stripeAccountStatus.details?.requirements && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stripeAccountStatus.details.requirements.currentlyDue.length > 0 && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-800">
                      {stripeAccountStatus.details.requirements.currentlyDue.length} requirement(s) due
                    </span>
                  )}
                  {stripeAccountStatus.details.requirements.pastDue.length > 0 && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-destructive/20 text-destructive">
                      {stripeAccountStatus.details.requirements.pastDue.length} past due
                    </span>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompleteVerification}
                className="mt-4 rounded-lg bg-yellow-500/20 text-yellow-800 border-yellow-500/30 hover:bg-yellow-500/30 transition-all"
              >
                Complete Stripe Setup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Membership Toggle Card */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-display text-lg font-semibold text-foreground">Paid Membership</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Enable paid membership for your community
            </p>
          </div>
          <Switch
            checked={isMembershipEnabled}
            onCheckedChange={setIsMembershipEnabled}
            disabled={!stripeAccountStatus.isEnabled}
          />
        </div>

        {isMembershipEnabled && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Monthly Membership Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-muted-foreground font-medium">€</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="pl-8 rounded-xl border-border/50"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Set the monthly price for your community membership
              </p>
            </div>

            <Button
              onClick={handlePriceUpdate}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 transition-all"
            >
              Update Membership Price
            </Button>
          </div>
        )}

        {!isMembershipEnabled && (
          <div className="bg-muted/30 p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">
              Your community is currently free to join. Enable paid membership to start monetizing your community.
            </p>
          </div>
        )}
      </div>

      {/* Promotional Period Info - Fluid Movement style */}
      <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-5">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-secondary" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-display text-base font-semibold text-foreground">First Month Free Promotion</h4>
            <p className="text-sm text-muted-foreground mt-2">
              New communities get 0% platform fees for the first 30 days. After that, standard tiered pricing applies (8% → 6% → 4% based on member count).
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayoutManagement = () => {
    if (!stripeAccountStatus.isEnabled) {
      return null;
    }

    return (
      <div className="space-y-6 pt-6 border-t border-border/50">
        {/* Payout Management Section - Fluid Movement style */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-6">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Payout Management
          </h3>
          {isLoadingPayouts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payoutData ? (
            <div className="space-y-6">
              {/* Current Balance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                  <p className="text-sm text-muted-foreground mb-1">Available</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {formatCurrency(payoutData.balance.available, payoutData.balance.currency)}
                  </p>
                </div>
                <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/10">
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {formatCurrency(payoutData.balance.pending, payoutData.balance.currency)}
                  </p>
                </div>
              </div>

              {/* Recent Payouts */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Recent Payouts
                </h4>
                <div className="space-y-3">
                  {payoutData.payouts.length > 0 ? (
                    payoutData.payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="bg-muted/30 p-4 rounded-xl border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-foreground">
                              {formatCurrency(payout.amount, payout.currency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payout.arrivalDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              payout.status === "paid"
                                ? "bg-primary/10 text-primary"
                                : payout.status === "pending"
                                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {payout.status}
                          </span>
                        </div>
                        {payout.bankAccount && (
                          <p className="text-sm text-muted-foreground mt-2">
                            To: •••• {payout.bankAccount.last4}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-xl">
                      No recent payouts
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-xl">
              No payout information available yet.
            </p>
          )}
        </div>

        {/* Bank Account Details Section - Fluid Movement style */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Bank Account Details
          </h3>
          {isLoadingBank ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bankAccount ? (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-xl">
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Bank Name:</span> {bankAccount.bank_name || "N/A"}
                </p>
                <p className="text-sm text-foreground mt-1">
                  <span className="text-muted-foreground">Account:</span> •••• {bankAccount.last4 || "N/A"}
                </p>
              </div>

              {/* IBAN Update Form */}
              {showIbanUpdateForm ? (
                <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl space-y-4">
                  <h4 className="font-display font-semibold text-foreground">
                    Update Bank Account
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        IBAN
                      </label>
                      <Input
                        type="text"
                        placeholder="FR76 1234 5678 9012 3456 7890 123"
                        value={newIban}
                        onChange={(e) => setNewIban(e.target.value.toUpperCase())}
                        className="rounded-xl border-border/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Account Holder Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Your full name as it appears on the account"
                        value={newAccountHolderName}
                        onChange={(e) => setNewAccountHolderName(e.target.value)}
                        className="rounded-xl border-border/50"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSubmitIbanUpdate}
                        disabled={isUpdatingIban || !newIban || !newAccountHolderName}
                        className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                      >
                        {isUpdatingIban && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Bank Account
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowIbanUpdateForm(false);
                          setNewIban('');
                          setNewAccountHolderName('');
                        }}
                        className="rounded-xl border-border/50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: This will replace your current bank account with the new one.
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowIbanUpdateForm(true)}
                  className="w-full rounded-xl border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all"
                >
                  Update Bank Account
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground bg-muted/20 p-4 rounded-xl">
                No bank account information found. Please add your bank account details via Stripe.
              </p>
              <Button
                onClick={handleUpdateIban}
                disabled={isUpdatingIban}
                className="w-full rounded-xl bg-primary hover:bg-primary/90"
              >
                {isUpdatingIban && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage Bank Account
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderThreadCategories = () => (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Organize your community discussions with custom categories
        </p>
        <Button
          onClick={handleAddCategory}
          variant="outline"
          size="sm"
          className="rounded-xl border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map((cat) => cat.id)}
            strategy={verticalListSortingStrategy}
          >
            {categories.length > 0 ? (
              <div className="divide-y divide-border/50">
                {categories.map((category) => (
                  <DraggableCategory
                    key={category.id}
                    category={category}
                    onRemove={handleRemoveCategory}
                    onChange={handleCategoryChange}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <TagIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No categories yet. Add some to help organize threads.
                </p>
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>

      {/* Save Button */}
      {categories.length > 0 && (
        <Button
          onClick={handleSaveCategories}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200"
        >
          Save Categories
        </Button>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid - Fluid Movement cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-6 border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300 ease-out space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Total Members</h3>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="font-display text-3xl font-bold text-foreground">
            {localCommunityStats?.totalMembers || 0}
          </p>
          <p className="text-sm text-primary font-medium">
            <TrendingUp className="h-4 w-4 inline mr-1" />+
            {localCommunityStats?.membershipGrowth || 0}% this month
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300 ease-out space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
            <div className="h-10 w-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-secondary" />
            </div>
          </div>
          <p className="font-display text-3xl font-bold text-foreground">
            €{revenueData.monthlyRevenue.toFixed(2)}
          </p>
          <p className="text-sm text-primary font-medium">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            {(localCommunityStats?.revenueGrowth ?? 0) >= 0 ? "+" : ""}
            {localCommunityStats?.revenueGrowth ?? 0}% this month
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300 ease-out space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Total Threads</h3>
            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
          </div>
          <p className="font-display text-3xl font-bold text-foreground">
            {localCommunityStats?.totalThreads || 0}
          </p>
          <p className="text-sm text-muted-foreground">Across all categories</p>
        </div>

        <div className="bg-card rounded-2xl p-6 border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300 ease-out space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Active Members</h3>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="font-display text-3xl font-bold text-foreground">
            {localCommunityStats?.activeMembers || 0}
          </p>
          <p className="text-sm text-muted-foreground">Current active memberships</p>
        </div>
      </div>

      {/* Quick Actions - Fluid Movement style */}
      <div className="bg-card rounded-2xl p-6 border border-border/50">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => setActiveCategory("subscriptions")}
            className="w-full h-12 rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Manage Subscriptions
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveCategory("members")}
            className="w-full h-12 rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
          >
            <Users className="h-4 w-4 mr-2" />
            View Members
          </Button>
        </div>
      </div>
    </div>
  );


  const renderMembers = () => (
    <div className="space-y-4">
      {isLoadingMembers ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 border border-border/50 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No members yet</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-muted/30 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage
                          src={member.imageUrl}
                          alt={member.displayName}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {member.displayName[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {member.displayName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {member.lastActive
                      ? new Date(member.lastActive).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all"
                    >
                      Remove
                    </Button>
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
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 overflow-y-auto">
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-card text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-5xl border border-border/50">
                  {/* Close button - Fluid Movement style */}
                  <button
                    type="button"
                    className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full bg-muted/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>

                  <div className="flex h-[80vh]">
                    {/* Sidebar - Fluid Movement style */}
                    <div className="w-1/4 bg-muted/30 border-r border-border/50 overflow-y-auto">
                      <div className="py-6 px-5 border-b border-border/50">
                        <h2 className="font-display text-xl font-semibold text-foreground">
                          {communityName}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Community settings
                        </p>
                      </div>
                      <nav className="mt-4 px-3 space-y-1">
                        {navigationCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`flex items-center w-full text-left py-2.5 px-4 rounded-xl transition-all duration-200 ${
                              activeCategory === category.id
                                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                            id={`settings-${category.id}`}
                          >
                            <category.icon
                              className={`h-5 w-5 mr-3 ${
                                activeCategory === category.id
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground"
                              }`}
                              aria-hidden="true"
                            />
                            {category.name}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Main content */}
                    <div className="w-3/4 p-8 overflow-y-auto bg-background">
                      <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
                        {
                          navigationCategories.find(
                            (c) => c.id === activeCategory
                          )?.name
                        }
                      </h2>

                      {activeCategory === "general" && (
                        <div className="space-y-8">
                          {/* Community Name */}
                          <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Community name
                              </label>
                              <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-xl border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                              />
                            </div>

                            {/* Description */}
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Description
                              </label>
                              <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="rounded-xl border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all resize-none"
                                placeholder="Tell people what your community is about..."
                              />
                            </div>
                          </div>

                          {/* Community Status */}
                          <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-4">
                            <h3 className="font-display text-lg font-semibold text-foreground">Status & Availability</h3>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Community Status
                              </label>
                              <Select
                                value={communityStatus}
                                onValueChange={(value: 'active' | 'pre_registration' | 'inactive') => setCommunityStatus(value)}
                              >
                                <SelectTrigger className="w-full rounded-xl border-border/50">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="active">Active - Members can join and access content</SelectItem>
                                  <SelectItem value="pre_registration">Pre-Registration - Accept pre-registrations only</SelectItem>
                                  <SelectItem value="inactive">Inactive - Community is closed</SelectItem>
                                </SelectContent>
                              </Select>

                              {communityStatus === 'pre_registration' && (
                                <div className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                  <p className="text-sm text-foreground">
                                    <strong>Pre-Registration Mode:</strong> Students can save their payment method now and will be automatically charged on the opening date.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Opening Date (conditional on pre-registration status) */}
                            {communityStatus === 'pre_registration' && (
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Opening Date & Time (your local time)
                                </label>
                                <Input
                                  type="datetime-local"
                                  value={openingDate ? (() => {
                                    // Convert UTC to local datetime-local format
                                    const date = new Date(openingDate);
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const hours = String(date.getHours()).padStart(2, '0');
                                    const minutes = String(date.getMinutes()).padStart(2, '0');
                                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                                  })() : ''}
                                  onChange={(e) => setOpeningDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                                  min={(() => {
                                    // Get current local time for min value
                                    const now = new Date();
                                    const year = now.getFullYear();
                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                    const day = String(now.getDate()).padStart(2, '0');
                                    const hours = String(now.getHours()).padStart(2, '0');
                                    const minutes = String(now.getMinutes()).padStart(2, '0');
                                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                                  })()}
                                  className="rounded-xl border-border/50"
                                  disabled={!canChangeOpeningDate}
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  Pre-registered members will be automatically charged on this date.
                                </p>

                                {!canChangeOpeningDate && (
                                  <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                      Opening date changes are currently restricted. Contact support if you need to modify the date.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Cover Image */}
                          <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-4">
                            <h3 className="font-display text-lg font-semibold text-foreground">Cover Image</h3>
                            <div className="w-full max-w-md mx-auto">
                              <div className="relative aspect-video overflow-hidden rounded-2xl group">
                                <img
                                  src={imageUrl || "/placeholder.svg"}
                                  alt="Community preview"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <label
                                  htmlFor="community-image"
                                  className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer rounded-2xl"
                                >
                                  {isUploading ? (
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                  ) : (
                                    <span className="px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm font-medium">
                                      Change Image
                                    </span>
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

                          {/* Custom Links Section */}
                          <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-4">
                            <h3 className="font-display text-lg font-semibold text-foreground">Custom Links</h3>
                            <p className="text-sm text-muted-foreground">
                              Add useful links for your community members (e.g., social media profiles, website)
                            </p>
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
                                    className="flex-1 rounded-xl border-border/50"
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
                                    className="flex-1 rounded-xl border-border/50"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleRemoveLink(index)}
                                    className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddLink}
                                className="w-full rounded-xl border-border/50 border-dashed hover:bg-primary/5 hover:border-primary/30 transition-all"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Link
                              </Button>
                            </div>
                          </div>

                          <Button
                            onClick={handleSaveChanges}
                            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200"
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
