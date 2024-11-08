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
  CalendarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  updateCommunityWithImage,
  updateCommunityDetails,
  updateCommunityCustomLinks,
  StripeAccountStatus,
  getCommunityDashboardData,
  getCommunityMembers,
  getThreadCategories,
  addThreadCategory,
  updateThreadCategory,
  deleteThreadCategory,
} from "@/lib/db";
import { storage } from "@/lib/firebase"; // Make sure this import is correct
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RefreshCcw } from "lucide-react"; // Import the refresh icon
import { Switch } from "@/components/ui/switch";
import { CreditCard, DollarSign, Calendar, Clock } from "lucide-react";
import { fetchWithAuth } from "@/lib/utils";

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communitySlug: string;
  communityName: string;
  communityDescription: string;
  imageUrl: string; // Change this from coverImageUrl
  onImageUpdate: (newImageUrl: string) => void; // Change this from onCoverImageUpdate
  onCommunityUpdate: (updates: {
    name?: string;
    description?: string;
    slug?: string;
  }) => void;
  customLinks: { title: string; url: string }[];
  onCustomLinksUpdate: (newLinks: { title: string; url: string }[]) => void;
  stripeConnectedAccountId: string | null;
  price?: number;
  currency?: string;
  subscriptionInterval?: "week" | "month" | "year";
  onPricingUpdate: (pricing: {
    price: number;
    currency: string;
    subscriptionInterval: "week" | "month" | "year";
  }) => void;
}

const categories = [
  { id: "dashboard", name: "Dashboard", icon: Squares2X2Icon },
  { id: "general", name: "General", icon: Cog6ToothIcon },
  { id: "members", name: "Members", icon: UserGroupIcon },
  { id: "subscriptions", name: "Subscriptions", icon: CreditCardIcon },
  { id: "thread_categories", name: "Thread Categories", icon: TagIcon },
  { id: "billing", name: "Billing", icon: CurrencyDollarIcon },
];

interface PaymentHistory {
  date: string;
  amount: number;
  status: string;
}

const CommunitySettingsModal: React.FC<CommunitySettingsModalProps> = ({
  isOpen,
  onClose,
  communityId,
  communitySlug,
  communityName,
  communityDescription,
  imageUrl,
  onImageUpdate,
  onCommunityUpdate,
  customLinks,
  onCustomLinksUpdate,
  stripeConnectedAccountId,
  price,
  currency,
  subscriptionInterval,
  onPricingUpdate,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("dashboard");
  const [name, setName] = useState(communityName);
  const [description, setDescription] = useState(communityDescription);
  const [image, setImage] = useState(imageUrl); // Change this from coverImage
  const [links, setLinks] = useState(customLinks);
  const [stripeAccountStatus, setStripeAccountStatus] =
    useState<StripeAccountStatus | null>(null);
  const [pricingState, setPricingState] = useState({
    price: price || 0,
    currency: currency || "USD",
    subscriptionInterval: subscriptionInterval || "month",
  });
  const [dashboardData, setDashboardData] = useState<{
    activeStudents: number;
    monthlyRevenue: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [members, setMembers] = useState<
    Array<{ id: string; name: string; email: string; joinedAt: string }>
  >([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [threadCategories, setThreadCategories] = useState<
    Array<{ id: string; name: string; count: number; membersCanPost: boolean }>
  >([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryMembersCanPost, setNewCategoryMembersCanPost] =
    useState(true);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    membersCanPost: boolean;
  } | null>(null);
  const [billingInfo, setBillingInfo] = useState<{
    currentPlan: string;
    currentPrice: number;
    currency: string;
    nextBillingDate: string | null;
    paymentHistory: Array<{
      date: string;
      amount: number;
      status: string;
    }>;
    subscriptionStatus: string;
  }>({
    currentPlan: "",
    currentPrice: 0,
    currency: "USD",
    nextBillingDate: null,
    paymentHistory: [],
    subscriptionStatus: "inactive",
  });

  useEffect(() => {
    const error = searchParams?.get("error");
    const stripeConnected = searchParams?.get("stripe_connected");

    if (error) {
      switch (error) {
        case "missing_params":
          toast.error("Missing required parameters for Stripe connection.");
          break;
        case "invalid_community":
          toast.error("Invalid community. Please try again.");
          break;
        case "already_connected":
          toast.error(
            "This community is already connected to a Stripe account."
          );
          break;
        case "account_in_use":
          toast.error(
            "This Stripe account is already connected to another community."
          );
          break;
        case "oauth_failed":
          toast.error("Failed to connect Stripe account. Please try again.");
          break;
        default:
          toast.error("An error occurred while connecting to Stripe.");
      }
    } else if (stripeConnected === "true") {
      toast.success("Successfully connected to Stripe!");
    }
  }, [searchParams]);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        try {
          const storageRef = ref(
            storage,
            `community-images/${communitySlug}-${Date.now()}`
          );
          const snapshot = await uploadBytes(storageRef, file);

          const downloadURL = await getDownloadURL(snapshot.ref);

          setImage(downloadURL);
          onImageUpdate(downloadURL);
          await updateCommunityWithImage(communitySlug, downloadURL);

          toast.success("Image uploaded successfully");
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error("Failed to upload image. Please try again.");
        }
      }
    },
    [communitySlug, onImageUpdate]
  );

  const handleSaveChanges = useCallback(async () => {
    try {
      // Save community details
      const newSlug = await updateCommunityDetails(communityId, {
        name,
        description,
      });
      onCommunityUpdate({ name, description, slug: newSlug });

      // Save custom links
      await updateCommunityCustomLinks(communityId, links);
      onCustomLinksUpdate(links);

      toast.success("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes. Please try again.");
    }
  }, [
    communityId,
    name,
    description,
    links,
    onCommunityUpdate,
    onCustomLinksUpdate,
  ]);

  const handleAddLink = () => {
    setLinks([...links, { title: "", url: "" }]);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
  };

  const handleLinkChange = (
    index: number,
    field: "title" | "url",
    value: string
  ) => {
    const newLinks = links.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    );
    setLinks(newLinks);
  };

  const handleSaveLinks = async () => {
    try {
      await updateCommunityCustomLinks(communityId, links);
      onCustomLinksUpdate(links);
      toast.success("Custom links updated successfully!");
    } catch (error) {
      console.error("Error saving custom links:", error);
      toast.error("Failed to update custom links. Please try again.");
    }
  };

  const handleConnectStripe = async () => {
    try {
      const response = await fetchWithAuth("/api/stripe/connect", {
        method: "POST",
        body: JSON.stringify({ communityId }),
      });

      if (!response.ok) throw new Error("Failed to create connect URL");
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error connecting to Stripe:", error);
      toast.error("Failed to connect to Stripe");
    }
  };

  const handleDisconnectStripe = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/stripe/disconnect", {
        method: "POST",
        body: JSON.stringify({ communityId }),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect Stripe account");
      }
      toast.success("Stripe account disconnected successfully");
      // You might want to update the local state or refetch community data here
    } catch (error) {
      console.error("Error disconnecting Stripe account:", error);
      toast.error("Failed to disconnect Stripe account. Please try again.");
    }
  }, [communityId]);

  // Function to check Stripe account status
  const checkStripeAccountStatus = useCallback(async () => {
    if (!stripeConnectedAccountId) return;

    try {
      const response = await fetchWithAuth("/api/stripe/account-status", {
        method: "POST",
        body: JSON.stringify({ communityId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch Stripe account status");
      }
      const data = await response.json();
      setStripeAccountStatus(data.status);
    } catch (error) {
      console.error("Error checking Stripe account status:", error);
      toast.error("Failed to check Stripe account status");
    }
  }, [stripeConnectedAccountId, communityId]);

  // Check Stripe account status on mount and every 5 minutes
  useEffect(() => {
    checkStripeAccountStatus();
    const intervalId = setInterval(checkStripeAccountStatus, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [checkStripeAccountStatus]);

  const handlePricingChange = (field: string, value: string | number) => {
    setPricingState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePricing = async () => {
    try {
      await onPricingUpdate(pricingState);
      toast.success("Pricing updated successfully!");
    } catch (error) {
      console.error("Error updating pricing:", error);
      toast.error("Failed to update pricing. Please try again.");
    }
  };

  const handleTestWebhook = async () => {
    try {
      const response = await fetch("/api/stripe/test-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ communityId, userId: "test_user_id" }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test webhook");
      }

      const data = await response.json();
      toast.success(data.message);
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error(
        "Failed to test webhook. Please check the console for more details."
      );
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/stripe/dashboard-data", {
        method: "POST",
        body: JSON.stringify({ communityId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to fetch dashboard data");
    }
  }, [communityId]);

  useEffect(() => {
    if (activeCategory === "dashboard") {
      fetchDashboardData();
    }
  }, [activeCategory, fetchDashboardData]);

  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const response = await fetch("/api/community/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ communityId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }

      const fetchedMembers = await response.json();
      setMembers(fetchedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [communityId]);

  useEffect(() => {
    if (activeCategory === "members") {
      fetchMembers();
    }
  }, [activeCategory, fetchMembers]);

  useEffect(() => {
    if (activeCategory === "thread_categories") {
      fetchThreadCategories();
    }
  }, [activeCategory, communityId]);

  const fetchThreadCategories = useCallback(async () => {
    try {
      const fetchedCategories = await getThreadCategories(communityId);
      setThreadCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching thread categories:", error);
      toast.error("Failed to fetch thread categories");
    }
  }, [communityId]);

  const handleAddThreadCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCategory = await addThreadCategory(
        communityId,
        newCategoryName,
        newCategoryMembersCanPost
      );
      if (newCategory) {
        setThreadCategories((prevCategories) => [
          ...prevCategories,
          newCategory,
        ]);
        setNewCategoryName("");
        setNewCategoryMembersCanPost(true);
        toast.success("Thread category added successfully");
      } else {
        toast.error("Failed to add thread category");
      }
    } catch (error) {
      console.error("Error adding thread category:", error);
      toast.error("Failed to add thread category");
    }
  };

  const handleUpdateThreadCategory = async () => {
    if (!editingCategory) return;
    try {
      const updatedCategory = await updateThreadCategory(
        communityId,
        editingCategory.id,
        {
          name: editingCategory.name,
          membersCanPost: editingCategory.membersCanPost,
        }
      );
      setThreadCategories((prevCategories) =>
        prevCategories.map((cat) =>
          cat.id === editingCategory.id ? { ...cat, ...updatedCategory } : cat
        )
      );
      setEditingCategory(null);
      toast.success("Thread category updated successfully");
    } catch (error) {
      console.error("Error updating thread category:", error);
      toast.error("Failed to update thread category");
    }
  };

  const handleDeleteThreadCategory = async (categoryId: string) => {
    try {
      await deleteThreadCategory(communityId, categoryId);
      setThreadCategories(
        threadCategories.filter((cat) => cat.id !== categoryId)
      );
      toast.success("Thread category deleted successfully");
    } catch (error) {
      console.error("Error deleting thread category:", error);
      toast.error("Failed to delete thread category");
    }
  };

  useEffect(() => {
    if (activeCategory === "billing") {
      fetchBillingInfo();
    }
  }, [activeCategory]);

  const fetchBillingInfo = async () => {
    try {
      console.log("Fetching billing info for community:", communityId);
      const response = await fetch("/api/stripe/billing-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ communityId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Billing info response not OK:",
          response.status,
          response.statusText,
          errorText
        );
        throw new Error(
          `Failed to fetch billing info: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Received billing info:", data);
      setBillingInfo(data);
    } catch (error) {
      console.error("Error fetching billing info:", error);
      toast.error(
        "Failed to fetch complete billing information. Some data may be unavailable."
      );
      // Set default values or partial data
      setBillingInfo((prevState) => ({
        ...prevState,
        currentPlan: "Creator",
        currentPrice: 0,
        currency: "USD",
        nextBillingDate: null,
        paymentHistory: [],
      }));
    }
  };

  // Add this function in your component
  const handleManagePayment = async () => {
    try {
      if (!stripeConnectedAccountId) {
        toast.error("This community is not connected to Stripe yet");
        return;
      }

      const currentUrl = window.location.href;

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: currentUrl, // Send the current URL as the return URL
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portal session");
      }

      if (!data.url) {
        throw new Error("No portal URL received");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Error redirecting to payment portal:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open payment management page"
      );
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Dashboard</h3>
        <Button
          onClick={fetchDashboardData}
          disabled={isRefreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Active Students</h3>
            <UserGroupIcon className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-3xl font-bold">
            {dashboardData?.activeStudents || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Monthly Revenue</h3>
            <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-3xl font-bold">
            ${(dashboardData?.monthlyRevenue || 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Current month</p>
        </div>
      </div>
    </div>
  );

  const renderGeneral = () => (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="community-name"
          className="block text-sm font-medium text-gray-700"
        >
          Community name
        </label>
        <Input
          type="text"
          id="community-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <label
          htmlFor="community-description"
          className="block text-sm font-medium text-gray-700"
        >
          Community description
        </label>
        <Textarea
          id="community-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1"
        />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Community Image</h3>
        <div className="mt-2">
          <div className="bg-gray-200 h-[200px] w-[300px] flex items-center justify-center overflow-hidden">
            {image ? (
              <img
                src={image}
                alt="Community"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-gray-500">No image</span>
            )}
          </div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="mt-2"
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">Recommended: 300x200</p>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Custom Links</h3>
        {links.map((link, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <Input
              type="text"
              value={link.title}
              onChange={(e) => handleLinkChange(index, "title", e.target.value)}
              placeholder="Link Title"
              className="flex-1"
            />
            <Input
              type="text"
              value={link.url}
              onChange={(e) => handleLinkChange(index, "url", e.target.value)}
              placeholder="URL"
              className="flex-1"
            />
            <Button onClick={() => handleRemoveLink(index)} variant="outline">
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={handleAddLink} className="mt-2">
          Add Link
        </Button>
      </div>

      <Button
        onClick={handleSaveChanges}
        className="bg-black text-white hover:bg-gray-800"
      >
        Save Changes
      </Button>
    </div>
  );

  const renderSubscriptions = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Stripe Connect</h3>
      {stripeConnectedAccountId ? (
        <>
          <p className="text-sm text-gray-500">
            Your community is connected to Stripe. You can now accept payments
            for your community.
          </p>
          {stripeAccountStatus ? (
            <div className="mt-4">
              <h4 className="text-md font-medium">Account Status:</h4>
              <ul className="list-disc list-inside mt-2">
                <li>
                  Charges Enabled:{" "}
                  {stripeAccountStatus.chargesEnabled ? "Yes" : "No"}
                </li>
                <li>
                  Payouts Enabled:{" "}
                  {stripeAccountStatus.payoutsEnabled ? "Yes" : "No"}
                </li>
                <li>
                  Details Submitted:{" "}
                  {stripeAccountStatus.detailsSubmitted ? "Yes" : "No"}
                </li>
                {stripeAccountStatus.requirements?.currentlyDue?.length > 0 && (
                  <li>
                    Requirements Due:
                    <ul className="list-disc list-inside ml-4">
                      {stripeAccountStatus.requirements.currentlyDue.map(
                        (req, index) => (
                          <li key={index}>{req}</li>
                        )
                      )}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p>Loading Stripe account status...</p>
          )}
          <div className="flex items-center space-x-4 mt-4">
            <Button
              onClick={() =>
                window.open("https://dashboard.stripe.com", "_blank")
              }
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              View Stripe Dashboard
            </Button>
            <Button
              onClick={handleDisconnectStripe}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Disconnect Stripe
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Connect your Stripe account to start accepting payments for your
            community.
          </p>
          <Button
            onClick={handleConnectStripe}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            Connect with Stripe
          </Button>
        </>
      )}

      <h3 className="text-lg font-medium mt-8">Subscription Pricing</h3>
      {stripeConnectedAccountId ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700"
            >
              Price
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <Input
                type="number"
                name="price"
                id="price"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
                value={pricingState.price}
                onChange={(e) =>
                  handlePricingChange("price", parseFloat(e.target.value))
                }
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="currency"
              className="block text-sm font-medium text-gray-700"
            >
              Currency
            </label>
            <Select
              value={pricingState.currency}
              onValueChange={(value) => handlePricingChange("currency", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                {/* Add more currencies as needed */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="interval"
              className="block text-sm font-medium text-gray-700"
            >
              Billing Interval
            </label>
            <Select
              value={pricingState.subscriptionInterval}
              onValueChange={(value) =>
                handlePricingChange("subscriptionInterval", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSavePricing} className="mt-4">
            Save Pricing
          </Button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Connect your Stripe account to set up subscription pricing.
        </p>
      )}

      <h3 className="text-lg font-medium mt-8">Webhook Testing</h3>
      <p className="text-sm text-gray-500">
        Use this button to simulate a webhook event for testing purposes.
      </p>
      <Button
        onClick={handleTestWebhook}
        className="bg-purple-500 text-white hover:bg-purple-600"
      >
        Test Webhook
      </Button>
    </div>
  );

  const renderMembers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Community Members</h3>
        <Button
          onClick={fetchMembers}
          disabled={isLoadingMembers}
          className="flex items-center space-x-2"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isLoadingMembers ? "animate-spin" : ""}`}
          />
          <span>{isLoadingMembers ? "Refreshing..." : "Refresh"}</span>
        </Button>
      </div>
      {isLoadingMembers ? (
        <p>Loading members...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{member.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderThreadCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New thread category name"
          className="flex-grow"
        />
        <div className="flex items-center space-x-2">
          <Switch
            checked={newCategoryMembersCanPost}
            onCheckedChange={setNewCategoryMembersCanPost}
            id="new-category-members-can-post"
          />
          <label htmlFor="new-category-members-can-post">
            Members can post
          </label>
        </div>
        <Button
          onClick={handleAddThreadCategory}
          className="bg-green-500 text-white hover:bg-green-600"
        >
          Add Category
        </Button>
      </div>
      <div className="space-y-4">
        {threadCategories.map((category) => (
          <div key={category.id} className="flex justify-between items-center">
            {editingCategory?.id === category.id ? (
              <>
                <Input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                    })
                  }
                  className="flex-grow mr-2"
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingCategory.membersCanPost}
                    onCheckedChange={(checked: any) =>
                      setEditingCategory({
                        ...editingCategory,
                        membersCanPost: checked,
                      })
                    }
                    id={`edit-category-members-can-post-${category.id}`}
                  />
                  <label
                    htmlFor={`edit-category-members-can-post-${category.id}`}
                  >
                    Members can post
                  </label>
                </div>
              </>
            ) : (
              <>
                <span>
                  {category.name} ({category.count})
                </span>
                <div className="flex items-center space-x-2">
                  <span>
                    {category.membersCanPost
                      ? "Members can post"
                      : "Only creators can post"}
                  </span>
                </div>
              </>
            )}
            <div>
              {editingCategory?.id === category.id ? (
                <Button
                  onClick={handleUpdateThreadCategory}
                  className="mr-2 bg-blue-500 text-white hover:bg-blue-600"
                >
                  Save
                </Button>
              ) : (
                <Button
                  onClick={() => setEditingCategory(category)}
                  className="mr-2"
                >
                  Edit
                </Button>
              )}
              <Button
                onClick={() => handleDeleteThreadCategory(category.id)}
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Billing Information</h3>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Current Plan
            </span>
          </div>
          <span className="text-sm font-semibold text-blue-600">
            {billingInfo.currentPlan}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Current Price
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: billingInfo.currency,
            }).format(billingInfo.currentPrice)}
          </span>
        </div>

        {/* Subscription Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Subscription Status
            </span>
          </div>
          <span
            className={`text-sm font-semibold px-2 py-1 rounded-full ${
              billingInfo.subscriptionStatus === "active"
                ? "bg-green-100 text-green-800"
                : billingInfo.subscriptionStatus === "cancelling"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {billingInfo.subscriptionStatus === "active"
              ? "Active"
              : billingInfo.subscriptionStatus === "cancelling"
              ? "Cancelling"
              : "Inactive"}
          </span>
        </div>

        {billingInfo.subscriptionStatus === "cancelling" &&
          billingInfo.nextBillingDate && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon
                    className="h-5 w-5 text-yellow-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Your subscription will end on{" "}
                    {new Date(billingInfo.nextBillingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Next Billing Date
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {billingInfo.nextBillingDate
              ? new Date(billingInfo.nextBillingDate).toLocaleDateString()
              : "N/A"}
          </span>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <h4 className="text-md font-medium">Payment History</h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {billingInfo.paymentHistory.map((payment, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(payment.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: billingInfo.currency,
                  }).format(payment.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      payment.status === "succeeded"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        onClick={handleManagePayment}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        Manage Payment Method
      </Button>
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
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
                      {categories.map((category) => (
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
                      {categories.find((c) => c.id === activeCategory)?.name}
                    </h2>
                    {activeCategory === "dashboard" && renderDashboard()}
                    {activeCategory === "general" && renderGeneral()}
                    {activeCategory === "members" && renderMembers()}
                    {activeCategory === "subscriptions" &&
                      renderSubscriptions()}
                    {activeCategory === "thread_categories" &&
                      renderThreadCategories()}
                    {activeCategory === "billing" && renderBilling()}
                    {/* Add content for other categories here */}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default CommunitySettingsModal;
