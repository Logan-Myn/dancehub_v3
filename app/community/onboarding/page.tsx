"use client";

import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Rocket, Heart, Smile, DollarSign, Smartphone, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/app/community/onboarding/OnboardingForm';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function OnboardingPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  React.useEffect(() => {
    const initializeSetupIntent = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !user) {
          router.push('/');
          return;
        }

        // Get a setup intent
        const response = await fetch('/api/stripe/create-setup-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to create setup intent: ${errorData}`);
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error initializing setup intent:', error);
        toast.error('Failed to initialize payment setup');
        router.push('/');
      }
    };

    initializeSetupIntent();
  }, [user, router, supabase]);

  // Show loading state while checking authentication
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
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
              <li className="flex items-center">
                <Rocket className="mr-2 text-blue-500" /> Highly engaged dancers
              </li>
              <li className="flex items-center">
                <Heart className="mr-2 text-red-500" /> Simple to setup
              </li>
              <li className="flex items-center">
                <Smile className="mr-2 text-yellow-500" /> Fun to use
              </li>
              <li className="flex items-center">
                <DollarSign className="mr-2 text-green-500" /> Charge for membership
              </li>
              <li className="flex items-center">
                <Smartphone className="mr-2 text-purple-500" /> iOS + Android apps
              </li>
              <li className="flex items-center">
                <Globe className="mr-2 text-indigo-500" /> Connect with dancers worldwide
              </li>
            </ul>
            <p className="mt-6 text-gray-600">help@dancehub.com</p>
          </div>

          {/* Right side - Onboarding form */}
          <div className="p-8 md:w-1/2 bg-gray-50">
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <OnboardingForm />
              </Elements>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 