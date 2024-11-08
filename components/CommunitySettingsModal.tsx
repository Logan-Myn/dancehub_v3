"use client";

import React, { useState, useCallback } from "react";
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
}

const categories = [
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
}: CommunitySettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState("dashboard");
  const [name, setName] = useState(communityName);
  const [description, setDescription] = useState(communityDescription);
  const [links, setLinks] = useState<CustomLink[]>(customLinks);

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