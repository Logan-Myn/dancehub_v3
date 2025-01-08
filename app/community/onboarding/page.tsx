"use client";

import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Rocket, Heart, Smile, DollarSign, Smartphone, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/app/community/onboarding/OnboardingForm';
import { useAuth } from "@/contexts/AuthContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function OnboardingPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Get a setup intent instead of a payment intent
    fetch('/api/stripe/create-setup-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
      }),
    })
      .then(response => response.json())
      .then(data => setClientSecret(data.clientSecret));
  }, [user, router]);

  if (!user) {
    return null;
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

          {/* Right side - Community creation form with payment */}
          <div className="p-8 md:w-1/2">
            <h2 className="text-2xl font-semibold mb-4">Create your Dance Community</h2>
            <p className="mb-6">
              Free for 14 days, then 49€/month. Cancel anytime. All features. Unlimited everything. No hidden fees.
            </p>
            
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <OnboardingForm />
              </Elements>
            ) : (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 