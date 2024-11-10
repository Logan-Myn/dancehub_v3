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
import { DollarSign, ExternalLink, Loader2, Plus, X, MessageCircle, Lock, Users } from 'lucide-react';
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

interface CustomLink {
  title: string;
  url: string;
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