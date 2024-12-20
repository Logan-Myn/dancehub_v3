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
import { storage, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { DollarSign, ExternalLink, Loader2, Plus, X, MessageCircle, Lock, Users, BarChart3, MessageSquare, TrendingUp } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { CATEGORY_ICONS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThreadCategory } from "@/types/community";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableCategory } from './DraggableCategory';
import { Card } from "@/components/ui/card";

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

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communitySlug: string;
  communityName: string;
  communityDescription: string;
  imageUrl: string;
  onImageUpdate: (newImageUrl: string) => void;
  onCommunityUpdate: (updates: {
    name?: string;
    description?: string;
    slug?: string;
  }) => void;
  customLinks?: CustomLink[];
  onCustomLinksUpdate?: (links: CustomLink[]) => void;
  stripeAccountId?: string | null;
  threadCategories?: ThreadCategory[];
  onThreadCategoriesUpdate?: (categories: ThreadCategory[]) => void;
  communityStats?: DashboardStats;
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
  status: 'active' | 'inactive';
  lastActive?: string;
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
  if (url.startsWith('http://') || url.startsWith('https://')) {
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
  onImageUpdate,
  onCommunityUpdate,
  customLinks = [],
  onCustomLinksUpdate = () => {},
  stripeAccountId,
  threadCategories = [],
  onThreadCategoriesUpdate = () => {},
  communityStats,
}: CommunitySettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState("dashboard");
  const [name, setName] = useState(communityName);
  const [description, setDescription] = useState(communityDescription);
  const [links, setLinks] = useState<CustomLink[]>(customLinks);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isLoadingStripeStatus, setIsLoadingStripeStatus] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [isMembershipEnabled, setIsMembershipEnabled] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<{
    isEnabled: boolean;
    needsSetup: boolean;
    accountId?: string;
    details?: {
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      requirements?: string[];
    };
  }>({
    isEnabled: false,
    needsSetup: true,
  });
  const [categories, setCategories] = useState<ThreadCategory[]>(threadCategories);
  const [localCommunityStats, setLocalCommunityStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData>({ monthlyRevenue: 0 });
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch Stripe account status when component mounts
  useEffect(() => {
    async function fetchStripeStatus() {
      if (!stripeAccountId) {
        setIsLoadingStripeStatus(false);
        return;
      }

      try {
        const response = await fetch(`/api/stripe/account-status/${stripeAccountId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe status');
        }
        
        const data = await response.json();
        setStripeAccountStatus({
          isEnabled: data.chargesEnabled && data.payoutsEnabled,
          needsSetup: !data.detailsSubmitted,
          accountId: stripeAccountId,
          details: data,
        });
      } catch (error) {
        console.error('Error fetching Stripe status:', error);
        setStripeAccountStatus({
          isEnabled: false,
          needsSetup: true,
        });
      } finally {
        setIsLoadingStripeStatus(false);
      }
    }

    fetchStripeStatus();
  }, [stripeAccountId]);

  useEffect(() => {
    async function fetchCommunityStats() {
      try {
        const response = await fetch(`/api/community/${communitySlug}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        const stats = await response.json();
        setLocalCommunityStats(stats);
      } catch (error) {
        console.error('Error fetching community stats:', error);
      }
    }

    if (activeCategory === 'dashboard') {
      fetchCommunityStats();
    }
  }, [communitySlug, activeCategory]);

  useEffect(() => {
    async function fetchRevenueData() {
      if (activeCategory === 'dashboard' && stripeAccountId) {
        try {
          const response = await fetch(`/api/community/${communitySlug}/stripe-revenue`);
          if (!response.ok) throw new Error('Failed to fetch revenue data');
          const data = await response.json();
          setRevenueData(data);
        } catch (error) {
          console.error('Error fetching revenue data:', error);
          toast.error('Failed to fetch revenue data');
        }
      }
    }

    fetchRevenueData();
  }, [activeCategory, communitySlug, stripeAccountId]);

  useEffect(() => {
    async function fetchMembers() {
      if (activeCategory === 'members') {
        setIsLoadingMembers(true);
        try {
          const response = await fetch(`/api/community/${communitySlug}/members`);
          if (!response.ok) throw new Error('Failed to fetch members');
          const data = await response.json();
          setMembers(data.members);
        } catch (error) {
          console.error('Error fetching members:', error);
          toast.error('Failed to fetch members');
        } finally {
          setIsLoadingMembers(false);
        }
      }
    }

    fetchMembers();
  }, [communitySlug, activeCategory]);

  const handleAddLink = () => {
    setLinks([...links, { title: '', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
  };

  const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = links.map((link, i) => {
      if (i === index) {
        if (field === 'url') {
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
      const loadingToast = toast.loading('Saving your changes...', {
        duration: Infinity, // The toast will remain until we dismiss it
      });

      const response = await fetch(`/api/community/${communitySlug}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          imageUrl,
          customLinks: links,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update community');
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
      toast.success('Your changes have been saved successfully!', {
        duration: 3000, // Toast will show for 3 seconds
        icon: '✅',
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes. Please try again.', {
        duration: 3000,
        icon: '❌',
      });
    }
  }, [name, description, imageUrl, links, communitySlug, onCommunityUpdate, onImageUpdate, onCustomLinksUpdate]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to upload images');
      }

      // Create a reference to the file in Firebase Storage
      const storageRef = ref(storage, `community-images/${communitySlug}-${Date.now()}`);
      
      // Upload the file with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: currentUser.uid,
          communityId: communityId,
        },
      };
      
      // Show loading toast
      const loadingToast = toast.loading('Uploading image...');
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update the image URL
      onImageUpdate(downloadURL);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image. Please try again.');
    }
  };

  const handleStripeConnect = async () => {
    try {
      setIsConnectingStripe(true);
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityId,
          userId: auth.currentUser?.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect Stripe');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast.error('Failed to connect Stripe');
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handlePriceUpdate = async () => {
    try {
      const response = await fetch(`/api/community/${communitySlug}/update-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price,
          enabled: isMembershipEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update price');
      }

      toast.success('Price updated successfully');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    }
  };

  const handleAddCategory = () => {
    const newCategory: ThreadCategory = {
      id: crypto.randomUUID(),
      name: '',
      iconType: CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)].label,
      color: '#000000',
    };
    setCategories([...categories, newCategory]);
  };

  const handleRemoveCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const handleCategoryChange = (id: string, field: keyof ThreadCategory, value: string | boolean) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  const handleSaveCategories = async () => {
    try {
      const response = await fetch(`/api/community/${communitySlug}/categories`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories }),
      });

      if (!response.ok) throw new Error('Failed to update categories');

      onThreadCategoriesUpdate(categories);
      toast.success('Categories updated successfully');
    } catch (error) {
      console.error('Error updating categories:', error);
      toast.error('Failed to update categories');
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
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(
        `/api/community/${communitySlug}/members/${memberId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to remove member');

      setMembers(members.filter(member => member.id !== memberId));
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const renderSubscriptions = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Community Membership</h3>
          {stripeAccountStatus.isEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Stripe Dashboard
            </Button>
          )}
        </div>

        {isLoadingStripeStatus ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : stripeAccountStatus.isEnabled ? (
          // Show membership settings if Stripe is connected
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Paid Membership</h4>
                <p className="text-sm text-gray-500">Enable paid membership for your community</p>
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

                <Button
                  onClick={handlePriceUpdate}
                  className="w-full"
                >
                  Update Membership Price
                </Button>
              </div>
            )}

            {!isMembershipEnabled && (
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  Your community is currently free to join. Enable paid membership to start monetizing your community.
                </p>
              </div>
            )}
          </div>
        ) : (
          // Show Stripe Connect button if not connected
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Stripe account to start accepting payments from your community members.
            </p>
            
            <Button
              onClick={handleStripeConnect}
              disabled={isConnectingStripe}
              className="w-full"
            >
              {isConnectingStripe ? (
                'Connecting...'
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Connect Stripe Account
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderThreadCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Thread Categories</h3>
        <Button
          onClick={handleAddCategory}
          variant="outline"
          size="sm"
        >
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
          items={categories.map(cat => cat.id)}
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
        <Button
          onClick={handleSaveCategories}
          className="w-full"
        >
          Save Categories
        </Button>
      )}

      {categories.length === 0 && (
        <p className="text-sm text-gray-500 text-center">
          No categories yet. Add some to help organize threads in your community.
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
          <p className="text-2xl font-bold">{localCommunityStats?.totalMembers || 0}</p>
          <p className="text-sm text-green-600">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            +{localCommunityStats?.membershipGrowth || 0}% this month
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Monthly Revenue</h3>
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
          <p className="text-2xl font-bold">{localCommunityStats?.totalThreads || 0}</p>
          <p className="text-sm text-gray-500">Across all categories</p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Active Members</h3>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">{localCommunityStats?.activeMembers || 0}</p>
          <p className="text-sm text-gray-500">In the last 30 days</p>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {/* We'll implement this later */}
          <p className="text-sm text-gray-500">Coming soon: Activity feed showing recent joins, posts, and interactions</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Community Members</h3>
        <p className="text-sm text-gray-500">Total: {members.length} members</p>
      </div>

      {isLoadingMembers ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
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
                          <img
                            className="h-10 w-10 rounded-full"
                            src={member.imageUrl}
                            alt={member.displayName}
                          />
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${member.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'}`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.lastActive 
                        ? new Date(member.lastActive).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      {navigationCategories.find((c) => c.id === activeCategory)?.name}
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
                            <div className="flex items-center space-x-4">
                              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt="Community cover"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <span className="text-gray-500">No image uploaded</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="mt-2"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                              Recommended size: 1200x400 pixels
                            </p>
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
                                  onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                                  className="flex-1"
                                />
                                <Input
                                  placeholder="URL (e.g., instagram.com/your-profile)"
                                  value={link.url}
                                  onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
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
                            Add useful links for your community members (e.g., social media profiles, website)
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

                    {activeCategory === "subscriptions" && renderSubscriptions()}

                    {activeCategory === "thread_categories" && renderThreadCategories()}

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