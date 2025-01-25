"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function OnboardingForm() {
  const [communityName, setCommunityName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setImageFile(file);
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeImage = () => {
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Function to generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  // Function to check name and slug availability
  const checkAvailability = async (name: string) => {
    const slug = generateSlug(name);
    
    // Check both name and slug
    const { data: existingCommunities, error } = await supabase
      .from('communities')
      .select('name, slug')
      .or(`name.eq.${name},slug.eq.${slug}`)
      .limit(1);

    if (error) {
      console.error('Error checking availability:', error);
      return false;
    }

    if (existingCommunities && existingCommunities.length > 0) {
      const community = existingCommunities[0];
      if (community.name.toLowerCase() === name.toLowerCase()) {
        setNameError('A community with this name already exists');
      } else {
        setNameError('This name would create a URL that is already taken');
      }
      return false;
    }

    setNameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Check availability before proceeding
      const isAvailable = await checkAvailability(communityName);
      if (!isAvailable) {
        setIsLoading(false);
        return;
      }

      let imageUrl = '';
      
      // Upload image if one is selected
      if (imageFile) {
        setIsUploading(true);
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `community-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("community-images")
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from("community-images")
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        setIsUploading(false);
      }

      const response = await fetch('/api/community/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: communityName,
          description: description,
          imageUrl: imageUrl,
          createdBy: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create community');
      }

      if (data.warning) {
        toast.success('Community created successfully, but there was a minor issue.');
        console.warn(data.warning);
      } else {
        toast.success('Community created successfully!');
      }

      router.push(`/community/${data.slug}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create community');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Community name
        </label>
        <Input
          type="text"
          value={communityName}
          onChange={async (e) => {
            const newName = e.target.value;
            setCommunityName(newName);
            if (newName.length > 2) {
              await checkAvailability(newName);
            } else {
              setNameError(null);
            }
          }}
          placeholder="Enter your community name"
          required
          className={`w-full ${nameError ? 'border-red-500' : ''}`}
        />
        {nameError && (
          <p className="mt-1 text-sm text-red-500">{nameError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about your community"
          required
          className="w-full min-h-[100px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Community photo
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
          <div className="w-full max-w-2xl space-y-1 text-center">
            <div className="flex flex-col items-center">
              {previewUrl && imageFile ? (
                <div className="relative w-full">
                  <div className="relative w-full h-40 rounded-lg overflow-hidden">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                  <div className="mt-2 text-sm text-gray-600">
                    {imageFile.name}
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={isLoading || isUploading} 
        className="w-full"
      >
        {isLoading ? 'Creating your community...' : 'Create Community'}
      </Button>
    </form>
  );
} 