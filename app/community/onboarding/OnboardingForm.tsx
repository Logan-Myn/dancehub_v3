"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useAuth } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';

export default function OnboardingForm() {
  const [communityName, setCommunityName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    setIsLoading(true);

    try {
      // First, create the community
      const communityResponse = await fetch('/api/community/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: communityName,
          createdBy: user.id,
        }),
      });

      if (!communityResponse.ok) {
        throw new Error('Failed to create community');
      }

      const { communityId, slug } = await communityResponse.json();

      // Create a subscription with trial period
      const subscriptionResponse = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityId,
          userId: user.id,
          email: user.email,
        }),
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to create subscription');
      }

      const { clientSecret } = await subscriptionResponse.json();

      if (!clientSecret) {
        throw new Error('No client secret received');
      }

      // Confirm the setup
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/community/${slug}`,
        },
      });

      if (error) {
        toast.error(error.message || 'Payment setup failed');
      } else {
        toast.success('Community created successfully! Your 2-week trial has started.');
        router.push(`/community/${slug}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create community');
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

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment details
        </label>
        <div className="p-4 border rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600 mb-4">
            Start with a 2-week free trial. Then €49/month.
          </p>
          <PaymentElement />
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full"
      >
        {isLoading ? 'Creating your community...' : 'Start 2-week free trial'}
      </Button>

      <p className="text-xs text-gray-500 text-center mt-2">
        You won't be charged during the trial period. Cancel anytime.
      </p>
    </form>
  );
} 