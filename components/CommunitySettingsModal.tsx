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
  { id: "billing", name: "Billing", icon: CurrencyDollarIcon },
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
  const [stripeAccountStatus, setStripeAccountStatus] = useState<StripeAccountStatus>({
    isEnabled: false,
    needsSetup: true,
    accountId: stripeAccountId || undefined,
    details: undefined
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
  const supabase = createClient();
  const { user } = useAuth();

  // Add effect to fetch initial membership state
  useEffect(() => {
    async function fetchMembershipState() {
      try {
        const response = await fetch(`/api/community/${communitySlug}`);
        if (!response.ok) throw new Error("Failed to fetch community data");

        const data = await response.json();
        console.log('Community Data for', communitySlug, ':', {
          raw_data: data,
          membership_price: data.membership_price,
          membership_enabled: data.membership_enabled,
          price_type: typeof data.membership_price,
          hasPrice: data.membership_price && data.membership_price > 0
        });
        
        // If there's a price set, enable the membership toggle
        const hasPrice = data.membership_price && data.membership_price > 0;
        
        setIsMembershipEnabled(hasPrice || data.membership_enabled || false);
        setPrice(data.membership_price || 0);
      } catch (error) {
        console.error("Error fetching membership state:", error);
      }
    }

    if (isOpen) {
      fetchMembershipState();
    }
  }, [communitySlug, isOpen]);

  // Fetch Stripe account status when component mounts or stripeAccountId changes
  useEffect(() => {
    async function fetchStripeStatus() {
      setIsLoadingStripeStatus(true);
      
      if (!stripeAccountId) {
        setStripeAccountStatus({
          isEnabled: false,
          needsSetup: true,
          accountId: undefined,
          details: undefined
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
            email: data.email
          },
        };
        
        setStripeAccountStatus(newStatus);
      } catch (error) {
        console.error('Error in fetchStripeStatus:', error);
        setStripeAccountStatus({
          isEnabled: false,
          needsSetup: true,
          accountId: stripeAccountId,
          details: undefined
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
    const setup = urlParams.get('setup');
    
    if (setup === 'complete' && stripeAccountId) {
      const fetchStatus = async () => {
        setIsLoadingStripeStatus(true);
        try {
          const response = await fetch(
            `/api/stripe/account-status/${stripeAccountId}`
          );
          if (!response.ok) throw new Error('Failed to fetch status');
          
          const data = await response.json();
          
          setStripeAccountStatus({
            isEnabled: data.chargesEnabled && data.payoutsEnabled,
            needsSetup: !data.detailsSubmitted,
            accountId: stripeAccountId,
            details: data,
          });
        } catch (error) {
          console.error('Error refreshing Stripe status:', error);
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
          const response = await fetch(`/api/community/${communitySlug}/stats`);
          if (!response.ok) throw new Error("Failed to fetch community stats");
          const data = await response.json();
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

  // Fetch revenue data
  useEffect(() => {
    async function fetchRevenueData() {
      if (activeCategory === "dashboard") {
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
  }, [communitySlug, activeCategory, isOpen]);

  useEffect(() => {
    async function fetchMembers() {
      if (activeCategory === "members") {
        setIsLoadingMembers(true);
        try {
          const response = await fetch(
            `/api/community/${communitySlug}/members`
          );
          if (!response.ok) throw new Error("Failed to fetch members");
          const data = await response.json();
          setMembers(data.members);
        } catch (error) {
          console.error("Error fetching members:", error);
          toast.error("Failed to fetch members");
        } finally {
          setIsLoadingMembers(false);
        }
      }
    }

    fetchMembers();
  }, [communitySlug, activeCategory]);

  useEffect(() => {
    async function fetchPayoutData() {
      if (activeCategory === "subscriptions" && stripeAccountId) {
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
  }, [activeCategory, communitySlug, stripeAccountId]);

  // Add effect to fetch bank account details
  useEffect(() => {
    async function fetchBankAccount() {
      if (activeCategory === "subscriptions" && stripeAccountId) {
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
  }, [activeCategory, stripeAccountId]);

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
          }
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

      const response = await fetch(`/api/community/${communitySlug}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          imageUrl,
          customLinks: links,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update community");
      }

      const data = await response.json();

      // Update all the data through parent component
      onCommunityUpdate({
        name: data.data.name,
        description: data.data.description,
      });
      onImageUpdate(data.data.imageUrl);
      onCustomLinksUpdate(data.data.customLinks);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Your changes have been saved successfully!", {
        duration: 3000, // Toast will show for 3 seconds
        icon: "✅",
      });
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
          returnUrl: window.location.href
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
      const response = await fetch(
        `/api/community/${communitySlug}/members/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to remove member");

      setMembers(members.filter((member) => member.id !== memberId));
      toast.success("Member removed successfully");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const renderSubscriptions = () => {
    if (isLoadingStripeStatus) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    // If no Stripe account is connected
    if (!stripeAccountId) {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium">Connect Stripe Account</h3>
            <p className="text-sm text-gray-500 mt-1">
              To enable subscriptions, you need to connect a Stripe account
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={handleStripeConnect}
              disabled={isConnectingStripe}
              className="w-full max-w-sm"
            >
              {isConnectingStripe ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCardIcon className="mr-2 h-4 w-4" />
                  Connect Stripe Account
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    // If Stripe account needs setup or verification
    if (stripeAccountStatus.needsSetup || 
        !stripeAccountStatus.isEnabled || 
        (stripeAccountStatus.details?.requirements?.eventuallyDue || []).length > 0) {
      return (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Lock className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Account Setup Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Your Stripe account needs additional setup before you can accept payments.
                  </p>
                  {(stripeAccountStatus.details?.requirements?.currentlyDue || []).length > 0 && (
                    <div className="mt-4">
                      <strong>Required documents:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {(stripeAccountStatus.details?.requirements?.currentlyDue || []).map((req) => (
                          <li key={req.code}>{req.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(stripeAccountStatus.details?.requirements?.eventuallyDue || []).length > 0 && (
                    <div className="mt-4">
                      <strong>Eventually required:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {(stripeAccountStatus.details?.requirements?.eventuallyDue || []).map((req) => (
                          <li key={req.code}>{req.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button onClick={handleCompleteVerification}>
                      Complete Verification
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // If Stripe account is fully set up
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Membership Settings</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Stripe Dashboard
          </Button>
        </div>

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
            />
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
                Your community is currently free to join. Enable paid membership to
                start monetizing your community.
              </p>
            </div>
          )}
        </div>

        <div className="pt-6 border-t">
          <h3 className="text-lg font-medium mb-4">Payout Management</h3>
          {payoutData ? (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 mb-4">
                  Current Balance
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">
                      €{payoutData.balance.available.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">Available</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      €{payoutData.balance.pending.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">
                  Recent Payouts
                </h4>
                <div className="space-y-4">
                  {payoutData.payouts.length > 0 ? (
                    payoutData.payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="bg-white p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              €{payout.amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(payout.arrivalDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payout.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : payout.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {payout.status}
                          </span>
                        </div>
                        {payout.bankAccount && (
                          <p className="text-sm text-gray-500 mt-2">
                            To: •••• {payout.bankAccount.last4}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No recent payouts
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Failed to load payout information
            </p>
          )}

          {/* Add Bank Account Management Section */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-lg font-medium mb-4">Bank Account Details</h4>
            {isLoadingBank ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="iban"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Bank Account Management
                  </label>
                  <p className="text-sm text-gray-500">
                    To update your bank account details, you'll be redirected to your Stripe Express dashboard
                  </p>
                </div>

                <Button
                  onClick={handleUpdateIban}
                  disabled={isUpdatingIban}
                  className="w-full"
                >
                  {isUpdatingIban ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    "Manage Bank Account"
                  )}
                </Button>
              </div>
            )}
          </div>
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
          <p className="text-sm text-gray-500">
            From {localCommunityStats?.totalMembers || 0} paid memberships
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
          <p className="text-sm text-gray-500">In the last 30 days</p>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {/* We'll implement this later */}
          <p className="text-sm text-gray-500">
            Coming soon: Activity feed showing recent joins, posts, and
            interactions
          </p>
        </div>
      </Card>

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
      <h3 className="text-lg font-medium">Community Members</h3>
      <p className="text-sm text-gray-500">Total: {members.length} members</p>

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
  );
}
