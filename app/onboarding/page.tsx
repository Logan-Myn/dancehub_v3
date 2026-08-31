"use client";

import React from 'react';
import { Rocket, Heart, Smile, Users, Smartphone, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/app/onboarding/OnboardingForm';
import { useAuth } from "@/contexts/AuthContext";

export default function OnboardingPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const signedOut = !loading && (!session || !user);

  React.useEffect(() => {
    // Nothing here to show a signed-out visitor. Send them back to the home
    // page, where the sign-up modal opens on top of the landing page instead of
    // on a bare interstitial. They return here once they're signed in.
    if (signedOut) {
      router.replace('/?auth=signup&redirect=%2Fonboarding');
    }
  }, [signedOut, router]);

  // Show loading state while checking authentication
  if (loading || !user) {
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
                <Users className="mr-2 text-green-500" /> Build your community
              </li>
              <li className="flex items-center">
                <Globe className="mr-2 text-indigo-500" /> Connect with dancers worldwide
              </li>
            </ul>
            <p className="mt-6 text-gray-600">hello@dancehub.com</p>
          </div>

          {/* Right side - Onboarding form */}
          <div className="p-8 md:w-1/2 bg-gray-50">
            <OnboardingForm />
          </div>
        </div>
      </div>
    </div>
  );
}