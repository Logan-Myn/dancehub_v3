"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, LinkIcon, CurrencyIcon, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import CommunityNavbar from "@/components/CommunityNavbar";
import Navbar from "@/app/components/Navbar";
import CommunitySettingsModal from "@/components/CommunitySettingsModal";
import Image from "next/image";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentModal from "@/components/PaymentModal";

interface Community {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  membersCount: number;
  createdBy: string;
  price?: number;
  currency?: string;
  customLinks?: { title: string; url: string }[];
  stripeAccountId?: string | null;
  membershipEnabled?: boolean;
  membershipPrice?: number;
}

export default function CommunityPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [members, setMembers] = useState<{
      displayName: string | undefined; id: string; imageUrl: string 
}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommunityData() {
      try {
        // Fetch community data from Firebase
        const communityData = await fetch(`/api/community/${communitySlug}`).then(res => res.json());
        setCommunity(communityData);

        if (user?.uid) {
          // Check if user is a member
          const membershipStatus = await fetch(`/api/community/${communitySlug}/membership/${user.uid}`).then(res => res.json());
          setIsMember(membershipStatus.isMember);
        }

        // Fetch members
        const membersData = await fetch(`/api/community/${communitySlug}/members`).then(res => res.json());
        setMembers(membersData);

      } catch (error) {
        console.error('Error fetching community data:', error);
        toast.error('Failed to load community data');
      } finally {
        setIsLoading(false);
      }
    }

    if (communitySlug) {
      fetchCommunityData();
    }
  }, [communitySlug, user?.uid]);

  const handleJoinCommunity = async () => {
    if (!user) {
      toast.error('Please sign in to join the community');
      return;
    }

    try {
      if (community?.membershipEnabled && community?.membershipPrice && community.membershipPrice > 0) {
        // Handle paid membership
        const response = await fetch(`/api/community/${communitySlug}/join-paid`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment');
        }

        const { clientSecret, stripeAccountId } = await response.json();
        setPaymentClientSecret(clientSecret);
        setStripeAccountId(stripeAccountId);
        setShowPaymentModal(true);
      } else {
        // Handle free membership
        const response = await fetch(`/api/community/${communitySlug}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.uid }),
        });

        if (!response.ok) {
          throw new Error('Failed to join community');
        }

        setIsMember(true);
        toast.success('Successfully joined the community!');
      }
    } catch (error) {
      console.error('Error joining community:', error);
      toast.error('Failed to join community');
    }
  };

  const handlePaymentSuccess = () => {
    setIsMember(true);
    setShowPaymentModal(false);
    toast.success('Successfully joined the community!');
  };

  const handleLeaveCommunity = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/community/${communitySlug}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to leave community');
      }

      // Update local state
      setIsMember(false);
      setMembers(prev => prev.filter(member => member.id !== user.uid));
      if (community) {
        setCommunity({
          ...community,
          membersCount: (community.membersCount || 1) - 1,
        });
      }

      toast.success('Successfully left the community');
    } catch (error) {
      console.error('Error leaving community:', error);
      toast.error('Failed to leave community');
    }
  };

  const handleCheckSubscription = async () => {
    if (!user) {
      toast.error('Please sign in to check subscription');
      return;
    }

    try {
      const response = await fetch(`/api/community/${communitySlug}/check-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (data.hasSubscription) {
        setIsMember(true); // Update local state if user is added to community
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('Failed to check subscription');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!community) {
    return <div>Community not found</div>;
  }

  const isCreator = user?.uid === community.createdBy;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="community" />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex space-x-8">
            {/* Main Content Area */}
            <div className="w-3/4">
              <div className="bg-white shadow-md rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4 cursor-pointer">
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <UserCircle2 className="w-10 h-10 text-gray-400" />
                  )}
                  <div className="flex-grow border-b border-gray-300 pb-2">
                    <span className="text-gray-500 font-roboto text-xl">Write something...</span>
                  </div>
                </div>
              </div>

              {/* Threads will go here in the next step */}
              <div className="space-y-6">
                <div className="bg-white shadow-md rounded-lg p-6">
                  <p className="text-gray-500">No posts yet</p>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-1/4">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {community.imageUrl && (
                  <img
                    src={community.imageUrl}
                    alt={community.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{community.name}</h2>
                  <p className="text-sm mb-2">{community.description}</p>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{community.membersCount} members</span>
                  </div>

                  {community.price && community.currency && (
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <CurrencyIcon className="h-4 w-4 mr-1" />
                      <span>{community.price} {community.currency}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {community.customLinks?.map((link, index) => (
                      <Link
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-gray-600 hover:underline"
                      >
                        <LinkIcon className="inline-block w-4 h-4 mr-2" />
                        {link.title}
                      </Link>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center space-x-2">
                    {Array.isArray(members) && members.length > 0 ? (
                      <>
                        {members.slice(0, 5).map((member) => (
                          <div key={member.id} className="relative group">
                            <Image
                              src={member.imageUrl}
                              alt={member.displayName || "Member"}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {member.displayName}
                            </div>
                          </div>
                        ))}
                        {members.length > 5 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                            +{members.length - 5}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">No members yet</div>
                    )}
                  </div>

                  {isCreator ? (
                    <Button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
                    >
                      Manage Community
                    </Button>
                  ) : isMember ? (
                    <Button
                      onClick={handleLeaveCommunity}
                      className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white"
                    >
                      Leave Community
                    </Button>
                  ) : (
                    <Button
                      onClick={handleJoinCommunity}
                      className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
                    >
                      {community.membershipPrice ? `Join for €${community.membershipPrice}/month` : 'Join Community'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
          © 2024 DanceHub. All rights reserved.
        </div>
      </footer>

      {community && (
        <CommunitySettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          communityId={community.id}
          communitySlug={communitySlug}
          communityName={community.name}
          communityDescription={community.description || ""}
          imageUrl={community.imageUrl || ""}
          customLinks={community.customLinks || []}
          stripeAccountId={community.stripeAccountId}
          onImageUpdate={(newImageUrl) => {
            setCommunity((prev) =>
              prev ? { ...prev, imageUrl: newImageUrl } : null
            );
          }}
          onCommunityUpdate={(updates) => {
            setCommunity((prev) =>
              prev ? { ...prev, ...updates } : null
            );
          }}
          onCustomLinksUpdate={(newLinks) => {
            setCommunity((prev) =>
              prev ? { ...prev, customLinks: newLinks } : null
            );
          }}
        />
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        clientSecret={paymentClientSecret}
        stripeAccountId={stripeAccountId}
        communitySlug={communitySlug}
        price={community?.membershipPrice || 0}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
} 