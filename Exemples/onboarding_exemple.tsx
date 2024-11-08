"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from 'next/navigation';
import { Rocket, Heart, Smile, DollarSign, Smartphone, Globe } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from '@/lib/utils';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function OnboardingForm() {
  const [communityName, setCommunityName] = useState('');
  const [description, setDescription] = useState('');
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
      const response = await fetchWithAuth('/api/community/create', {
        method: 'POST',
        body: JSON.stringify({
          name: communityName,
          description,
          createdBy: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create community');
      }

      const { communityId, slug } = await response.json();

      // Then handle the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/community/${slug}`,
          payment_method_data: {
            billing_details: {}
          }
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        toast.success('Community created successfully!');
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Community name</label>
        <Input
          type="text"
          value={communityName}
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="Enter community name"
          required
          className="mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your community"
          required
          className="mt-1"
        />
      </div>

      <div className="p-4 border rounded-lg">
        <PaymentElement />
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isLoading ? 'Creating...' : 'Create Community'}
      </Button>
    </form>
  );
}

export default function OnboardingPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      fetchWithAuth('/api/stripe/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: 4900, // $49.00
          currency: 'usd',
          metadata: {  // Add metadata here instead
            userId: user.uid
          }
        }),
      })
        .then(response => response.json())
        .then(data => setClientSecret(data.clientSecret));
    }
  }, [user]);

  if (!clientSecret) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl w-full">
        <div className="flex flex-col md:flex-row">
          {/* Left side - DanceHub information */}
          <div className="p-8 md:w-1/2">
            <h1 className="text-3xl font-bold mb-4 text-black">DanceHub.</h1>
            <h2 className="text-xl font-semibold mb-6">
              Everything you need to build a dance community and share your passion online.
            </h2>
            <ul className="space-y-4">
              <li className="flex items-center"><Rocket className="mr-2 text-blue-500" /> Highly engaged dancers</li>
              <li className="flex items-center"><Heart className="mr-2 text-red-500" /> Simple to setup</li>
              <li className="flex items-center"><Smile className="mr-2 text-yellow-500" /> Fun to use</li>
              <li className="flex items-center"><DollarSign className="mr-2 text-green-500" /> Charge for membership</li>
              <li className="flex items-center"><Smartphone className="mr-2 text-purple-500" /> iOS + Android apps</li>
              <li className="flex items-center"><Globe className="mr-2 text-indigo-500" /> Connect with dancers worldwide</li>
            </ul>
            <p className="mt-6 text-gray-600">help@dancehub.com</p>
          </div>

          {/* Right side - Community creation form with payment */}
          <div className="p-8 md:w-1/2">
            <h2 className="text-2xl font-semibold mb-4">Create your Dance Community</h2>
            <p className="mb-6">Free for 14 days, then 49€/month. Cancel anytime. All features. Unlimited everything. No hidden fees.</p>
            
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <OnboardingForm />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}
