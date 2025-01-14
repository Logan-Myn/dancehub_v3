"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';

export default function OnboardingForm() {
  const [communityName, setCommunityName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/community/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: communityName,
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
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="Enter your community name"
          required
          className="w-full"
        />
      </div>

      <Button 
        type="submit" 
        disabled={isLoading} 
        className="w-full"
      >
        {isLoading ? 'Creating your community...' : 'Create Community'}
      </Button>
    </form>
  );
} 