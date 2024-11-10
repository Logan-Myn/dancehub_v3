"use client";

import { useState, useEffect, useMemo } from "react";
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
import Thread from '@/components/Thread';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ThreadCard from '@/components/ThreadCard';
import ThreadModal from '@/components/ThreadModal';
import { ThreadCategory } from "@/types/community";
import ThreadCategories from '@/components/ThreadCategories';

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
  threadCategories?: ThreadCategory[];
}

interface Thread {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  userId: string;
  likesCount: number;
  commentsCount: number;
  category?: string;
  categoryId?: string;
  author: {
    name: string;
    image: string;
  };
  likes?: string[];
  comments?: any[];
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
  const [isWriting, setIsWriting] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

        // Fetch threads
        const threadsData = await fetch(`/api/community/${communitySlug}/threads`).then(res => res.json());
        setThreads(threadsData);

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

  const handleNewThread = async (newThread: any) => {
    const threadWithAuthor = {
      ...newThread,
      author: {
        name: user?.displayName || 'Anonymous',
        image: user?.photoURL || '',
      },
      categoryId: newThread.categoryId,
      category: community?.threadCategories?.find(
        cat => cat.id === newThread.categoryId
      )?.name,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
    };

    // Add the new thread to the beginning of the list
    setThreads(prevThreads => [threadWithAuthor, ...prevThreads]);
    setIsWriting(false);
  };

  // Update the filtering logic to use category IDs
  const filteredThreads = useMemo(() => {
    if (!selectedCategory) {
      return threads;
    }

    return threads.filter(thread => {
      // Check if the thread's category matches the selected category ID
      return thread.categoryId === selectedCategory;
    });
  }, [threads, selectedCategory]);

  const handleLikeUpdate = (threadId: string, newLikesCount: number, liked: boolean) => {
    setThreads(prevThreads =>
      prevThreads.map(thread =>
        thread.id === threadId
          ? {
              ...thread,
              likesCount: newLikesCount,
              likes: liked 
                ? [...(thread.likes || []), user!.uid]
                : (thread.likes || []).filter(id => id !== user!.uid),
            }
          : thread
      )
    );

    // Also update selected thread if open
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev => 
        prev ? {
          ...prev,
          likesCount: newLikesCount,
          likes: liked 
            ? [...(prev.likes || []), user!.uid]
            : (prev.likes || []).filter(id => id !== user!.uid),
        } : null
      );
    }
  };

  const handleCommentUpdate = (threadId: string, newComment: any) => {
    setThreads(prevThreads =>
      prevThreads.map(thread =>
        thread.id === threadId
          ? {
              ...thread,
              comments: [...(thread.comments || []), newComment],
              commentsCount: (thread.commentsCount || 0) + 1,
            }
          : thread
      )
    );

    // Also update selected thread if open
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev =>
        prev ? {
          ...prev,
          comments: [...(prev.comments || []), newComment],
          commentsCount: (prev.commentsCount || 0) + 1,
        } : null
      );
    }
  };

  const handleThreadUpdate = (threadId: string, updates: { title: string; content: string }) => {
    setThreads(prevThreads =>
      prevThreads.map(thread =>
        thread.id === threadId
          ? { ...thread, ...updates }
          : thread
      )
    );

    // Also update selected thread if open
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev =>
        prev ? { ...prev, ...updates } : null
      );
    }
  };

  // Add handleThreadDelete function
  const handleThreadDelete = (threadId: string) => {
    setThreads(prevThreads => prevThreads.filter(thread => thread.id !== threadId));
    setSelectedThread(null);
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
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                {isWriting ? (
                  <Thread
                    communityId={community.id}
                    userId={user?.uid || ''}
                    communityName={community.name}
                    community={community}
                    onSave={handleNewThread}
                    onCancel={() => setIsWriting(false)}
                  />
                ) : (
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user?.photoURL || ''}
                        alt={user?.displayName || 'User'}
                      />
                      <AvatarFallback>
                        {user?.displayName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      onClick={() => user ? setIsWriting(true) : toast.error('Please sign in to post')}
                      className="flex-grow cursor-text rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 text-sm text-gray-500 transition-colors"
                    >
                      Write something...
                    </div>
                  </div>
                )}
              </div>

              {/* Categories filter */}
              {community.threadCategories && community.threadCategories.length > 0 && (
                <ThreadCategories
                  categories={community.threadCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              )}

              {/* Threads list */}
              <div className="space-y-4">
                {filteredThreads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    id={thread.id}
                    title={thread.title}
                    content={thread.content}
                    author={thread.author}
                    createdAt={thread.createdAt}
                    likesCount={thread.likesCount}
                    commentsCount={thread.commentsCount}
                    category={thread.category}
                    categoryType={community.threadCategories?.find(
                      cat => cat.id === thread.categoryId
                    )?.iconType}
                    onClick={() => setSelectedThread(thread)}
                    likes={thread.likes}
                    onLikeUpdate={handleLikeUpdate}
                  />
                ))}
                {filteredThreads.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No threads in this category yet.
                  </div>
                )}
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
          threadCategories={community.threadCategories}
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
          onThreadCategoriesUpdate={(categories) => {
            setCommunity((prev) =>
              prev ? { ...prev, threadCategories: categories } : null
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

      {selectedThread && (
        <ThreadModal
          isOpen={!!selectedThread}
          onClose={() => setSelectedThread(null)}
          thread={{
            ...selectedThread,
            categoryType: community.threadCategories?.find(
              cat => cat.id === selectedThread.categoryId
            )?.iconType,
          }}
          onLikeUpdate={handleLikeUpdate}
          onCommentUpdate={handleCommentUpdate}
          onThreadUpdate={handleThreadUpdate}
          onDelete={handleThreadDelete}
        />
      )}
    </div>
  );
} 