"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, LinkIcon, CurrencyIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import Image from "next/image";
import CommunitySettingsModal from "@/components/CommunitySettingsModal";
import PaymentModal from "@/components/PaymentModal";
import Thread from "@/components/Thread";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ThreadCard from "@/components/ThreadCard";
import ThreadModal from "@/components/ThreadModal";
import ThreadCategories from "@/components/ThreadCategories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThreadCategory } from "@/types/community";
import { User } from "@supabase/supabase-js";

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

interface Props {
  community: Community;
  initialMembers: any[];
  initialTotalMembers: number;
  initialThreads: Thread[];
  initialIsMember: boolean;
  currentUser: User | null;
  isCreator: boolean;
}

export default function ClientCommunityPage({
  community,
  initialMembers,
  initialTotalMembers,
  initialThreads,
  initialIsMember,
  currentUser,
  isCreator,
}: Props) {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const [isMember, setIsMember] = useState(initialIsMember);
  const [members, setMembers] = useState(initialMembers);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [totalMembers, setTotalMembers] = useState(initialTotalMembers);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const handleJoinCommunity = async () => {
    if (!currentUser) {
      toast.error("Please sign in to join the community");
      return;
    }

    try {
      if (
        community?.membershipEnabled &&
        community?.membershipPrice &&
        community.membershipPrice > 0
      ) {
        // Handle paid membership
        const response = await fetch(
          `/api/community/${communitySlug}/join-paid`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: currentUser.id,
              email: currentUser.email,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to create payment");
        }

        const { clientSecret, stripeAccountId } = await response.json();
        setPaymentClientSecret(clientSecret);
        setStripeAccountId(stripeAccountId);
        setShowPaymentModal(true);
      } else {
        // Handle free membership
        const response = await fetch(`/api/community/${communitySlug}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });

        if (!response.ok) {
          throw new Error("Failed to join community");
        }

        setIsMember(true);
        toast.success("Successfully joined the community!");
      }
    } catch (error) {
      console.error("Error joining community:", error);
      toast.error("Failed to join community");
    }
  };

  const handleLeaveCommunity = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/community/${communitySlug}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to leave community");
      }

      // Update local state
      setIsMember(false);
      setMembers((prev) => prev.filter((member) => member.id !== currentUser.id));
      setShowLeaveDialog(false);
      
      // Refresh the page to ensure everything is updated
      window.location.reload();

      toast.success("Successfully left the community");
    } catch (error) {
      console.error("Error leaving community:", error);
      toast.error("Failed to leave community");
    }
  };

  const handleNewThread = async (newThread: any) => {
    const threadWithAuthor = {
      ...newThread,
      author: {
        name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || "Anonymous",
        image: currentUser?.user_metadata?.avatar_url || "",
      },
      categoryId: newThread.categoryId,
      category: community?.threadCategories?.find(
        (cat) => cat.id === newThread.categoryId
      )?.name,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
    };

    setThreads((prevThreads) => [threadWithAuthor, ...prevThreads]);
    setIsWriting(false);
  };

  const filteredThreads = useMemo(() => {
    if (!selectedCategory) {
      return threads;
    }

    return threads.filter((thread) => thread.categoryId === selectedCategory);
  }, [threads, selectedCategory]);

  const handleLikeUpdate = (
    threadId: string,
    newLikesCount: number,
    liked: boolean
  ) => {
    setThreads((prevThreads) =>
      prevThreads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              likesCount: newLikesCount,
              likes: liked
                ? [...(thread.likes || []), currentUser!.id]
                : (thread.likes || []).filter((id) => id !== currentUser!.id),
            }
          : thread
      )
    );

    if (selectedThread?.id === threadId) {
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              likesCount: newLikesCount,
              likes: liked
                ? [...(prev.likes || []), currentUser!.id]
                : (prev.likes || []).filter((id) => id !== currentUser!.id),
            }
          : null
      );
    }
  };

  const handleCommentUpdate = (threadId: string, newComment: any) => {
    setThreads((prevThreads) =>
      prevThreads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              comments: [...(thread.comments || []), newComment],
              commentsCount: (thread.commentsCount || 0) + 1,
            }
          : thread
      )
    );

    if (selectedThread?.id === threadId) {
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), newComment],
              commentsCount: (prev.commentsCount || 0) + 1,
            }
          : null
      );
    }
  };

  const handleThreadUpdate = (threadId: string, updates: any) => {
    setThreads((prevThreads) =>
      prevThreads.map((thread) =>
        thread.id === threadId ? { ...thread, ...updates } : thread
      )
    );

    if (selectedThread?.id === threadId) {
      setSelectedThread((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const handleThreadDelete = (threadId: string) => {
    setThreads((prevThreads) =>
      prevThreads.filter((thread) => thread.id !== threadId)
    );
    setSelectedThread(null);
  };

  return (
    <main className="flex-grow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Main Content Area */}
          <div className="w-3/4">
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              {isWriting ? (
                <Thread
                  communityId={community.id}
                  userId={currentUser?.id || ""}
                  communityName={community.name}
                  community={community}
                  onSave={handleNewThread}
                  onCancel={() => setIsWriting(false)}
                />
              ) : (
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={currentUser?.user_metadata?.avatar_url || ""}
                      alt={currentUser?.user_metadata?.full_name || "User"}
                    />
                    <AvatarFallback>
                      {currentUser?.user_metadata?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    onClick={() =>
                      currentUser
                        ? setIsWriting(true)
                        : toast.error("Please sign in to post")
                    }
                    className="flex-grow cursor-text rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 text-sm text-gray-500 transition-colors"
                  >
                    Write something...
                  </div>
                </div>
              )}
            </div>

            {/* Categories filter */}
            {community.threadCategories &&
              community.threadCategories.length > 0 && (
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
                  created_at={thread.createdAt}
                  likes_count={thread.likesCount}
                  comments_count={thread.commentsCount}
                  category={thread.category}
                  category_type={
                    community.threadCategories?.find(
                      (cat) => cat.id === thread.categoryId
                    )?.iconType
                  }
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
                  <span>{totalMembers} members</span>
                </div>

                {community.price && community.currency && (
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <CurrencyIcon className="h-4 w-4 mr-1" />
                    <span>
                      {community.price} {community.currency}
                    </span>
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
                    onClick={() => setShowLeaveDialog(true)}
                    className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white"
                  >
                    Leave Community
                  </Button>
                ) : (
                  <Button
                    onClick={handleJoinCommunity}
                    className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
                  >
                    {community.membershipPrice
                      ? `Join for €${community.membershipPrice}/month`
                      : "Join Community"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
          stripeAccountId={community.stripeAccountId ?? null}
          threadCategories={community.threadCategories ?? []}
          onImageUpdate={(newImageUrl) => {
            // No need to update community state as it will be refreshed on page reload
          }}
          onCommunityUpdate={(updates) => {
            // No need to update community state as it will be refreshed on page reload
          }}
          onCustomLinksUpdate={(newLinks) => {
            // No need to update community state as it will be refreshed on page reload
          }}
          onThreadCategoriesUpdate={(categories) => {
            // No need to update community state as it will be refreshed on page reload
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
        onSuccess={() => {
          setIsMember(true);
          setShowPaymentModal(false);
          toast.success("Successfully joined the community!");
        }}
      />

      {selectedThread && (
        <ThreadModal
          isOpen={!!selectedThread}
          onClose={() => setSelectedThread(null)}
          thread={{
            id: selectedThread.id,
            user_id: selectedThread.userId,
            title: selectedThread.title,
            content: selectedThread.content,
            author: selectedThread.author,
            created_at: selectedThread.createdAt,
            likes_count: selectedThread.likesCount,
            comments_count: selectedThread.commentsCount,
            category: selectedThread.category,
            category_type: community.threadCategories?.find(
              (cat) => cat.id === selectedThread.categoryId
            )?.iconType,
            likes: selectedThread.likes,
            comments: selectedThread.comments,
          }}
          onLikeUpdate={handleLikeUpdate}
          onCommentUpdate={handleCommentUpdate}
          onThreadUpdate={handleThreadUpdate}
          onDelete={handleThreadDelete}
        />
      )}

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Community</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this community? You'll lose access
              to all content and need to rejoin to access it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveCommunity}
              className="bg-red-500 hover:bg-red-600"
            >
              Leave Community
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
