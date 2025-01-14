"use client";

import { useState, useMemo, useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
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
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatDisplayName } from "@/lib/utils";

interface CustomLink {
  title: string;
  url: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
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
  category_type?: string;
  author: {
    name: string;
    image: string;
  };
  likes?: string[];
  comments?: any[];
  pinned?: boolean;
}

interface Member {
  id: string;
  user_id: string;
  community_id: string;
  role: string;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  created_by: string;
  created_at: string;
  membersCount: number;
  createdBy: string;
  imageUrl: string;
  customLinks?: CustomLink[];
  membershipEnabled?: boolean;
  membershipPrice?: number;
  threadCategories?: ThreadCategory[];
  stripeAccountId?: string | null;
}

interface ThreadCardProps {
  thread: {
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
  };
  currentUser: User | null;
  onLike: (threadId: string, newLikesCount: number, liked: boolean) => void;
  onClick: () => void;
}

interface ThreadCategoriesProps {
  categories: ThreadCategory[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communitySlug: string;
  communityName: string;
  communityDescription: string;
  imageUrl: string;
  customLinks: CustomLink[];
  stripeAccountId: string | null;
  threadCategories: ThreadCategory[];
  onImageUpdate: (newImageUrl: string) => void;
  onCommunityUpdate: (updates: Partial<Community>) => void;
  onCustomLinksUpdate: (newLinks: CustomLink[]) => void;
  onThreadCategoriesUpdate: (categories: ThreadCategory[]) => void;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string | null;
  stripeAccountId: string | null;
  price: number;
  onSuccess: () => void;
  communitySlug: string;
}

export default function CommunityPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user: currentUser } = useAuth();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newThreadId, setNewThreadId] = useState<string | null>(null);
  const [lastCreatedThread, setLastCreatedThread] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function fetchData() {
      try {
        // Get community data
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("*")
          .eq("slug", communitySlug)
          .single();

        if (communityError || !communityData) {
          notFound();
          return;
        }

        // Get creator's Stripe account ID
        const { data: creatorData } = await supabase
          .from("profiles")
          .select("stripe_account_id")
          .eq("id", communityData.created_by)
          .single();

        // Get members with profiles
        const { data: membersData, error: membersError } = await supabase
          .from("community_members_with_profiles")
          .select("*")
          .eq("community_id", communityData.id);

        if (membersError) {
          console.error("Members error:", membersError);
          throw membersError;
        }

        // Format members data with profile information
        const formattedMembers = membersData.map((member) => ({
          ...member,
          profile: {
            id: member.user_id,
            full_name: member.full_name || "Anonymous",
            avatar_url: member.avatar_url,
          },
        }));

        // Get threads
        const { data: threadsData, error: threadsError } = await supabase
          .from("threads")
          .select("*")
          .eq("community_id", communityData.id)
          .order("created_at", { ascending: false });

        if (threadsError) throw threadsError;

        // Format threads data
        const formattedThreads = threadsData.map((thread) => ({
          id: thread.id,
          title: thread.title,
          content: thread.content,
          createdAt: thread.created_at,
          userId: thread.user_id,
          likesCount: (thread.likes || []).length,
          commentsCount: (thread.comments || []).length,
          category: thread.category,
          categoryId: thread.category_id,
          author: {
            name: thread.author_name || "Anonymous",
            image: thread.author_image || "",
          },
          likes: thread.likes || [],
          comments: thread.comments || [],
          pinned: thread.pinned || false,
        }));

        // Format community data
        const formattedCommunity: Community = {
          ...communityData,
          membersCount: membersData.length,
          createdBy: communityData.created_by,
          imageUrl: communityData.image_url,
          threadCategories: communityData.thread_categories || [],
          customLinks: communityData.custom_links || [],
          membershipEnabled: communityData.membership_enabled || false,
          membershipPrice: communityData.membership_price || 0,
          stripeAccountId: creatorData?.stripe_account_id || null,
        };

        setCommunity(formattedCommunity);
        setMembers(formattedMembers);
        setThreads(formattedThreads);
        setIsMember(
          currentUser
            ? membersData.some((member) => member.user_id === currentUser.id)
            : false
        );
        setIsCreator(currentUser?.id === communityData.created_by);
        setTotalMembers(membersData.length);
      } catch (error) {
        console.error("Error:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    }

    if (communitySlug) {
      fetchData();
    }
  }, [communitySlug, currentUser]);

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
          const errorData = await response.json();
          console.error("Join community error:", errorData);
          throw new Error(errorData.error || "Failed to join community");
        }

        const data = await response.json();
        setIsMember(true);
        setTotalMembers((prev) => prev + 1);
        toast.success("Successfully joined the community!");
      }
    } catch (error) {
      console.error("Error joining community:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join community"
      );
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
      setMembers((prev) =>
        prev.filter((member) => member.id !== currentUser.id)
      );
      setTotalMembers((prev) => prev - 1);
      setShowLeaveDialog(false);

      toast.success("Successfully left the community");
    } catch (error) {
      console.error("Error leaving community:", error);
      toast.error("Failed to leave community");
    }
  };

  const handleNewThread = async (newThread: any) => {
    const selectedCategory = community?.threadCategories?.find(
      (cat) => cat.id === newThread.categoryId
    );

    const threadWithAuthor = {
      ...newThread,
      author: {
        name: currentUser?.user_metadata?.full_name || "Anonymous",
        image: currentUser?.user_metadata?.avatar_url || "",
      },
      categoryId: newThread.categoryId,
      category: selectedCategory?.name || "General",
      category_type: selectedCategory?.iconType,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      likes: [],
      comments: [],
    };

    setThreads((prevThreads) => [threadWithAuthor, ...prevThreads]);
    setLastCreatedThread(threadWithAuthor.id);
    setIsWriting(false);
  };

  useEffect(() => {
    if (lastCreatedThread) {
      // Force a re-render for the new thread
      setThreads((threads) => [...threads]);
      setLastCreatedThread(null);
    }
  }, [lastCreatedThread]);

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
              commentsCount: thread.commentsCount + 1,
              comments: [...(thread.comments || []), newComment],
            }
          : thread
      )
    );

    if (selectedThread?.id === threadId) {
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              commentsCount: prev.commentsCount + 1,
              comments: [...(prev.comments || []), newComment],
            }
          : null
      );
    }
  };

  const filteredThreads = useMemo(() => {
    let filtered = [...threads];
    
    if (selectedCategory) {
      filtered = filtered.filter((thread) => thread.categoryId === selectedCategory);
    }
    
    // Sort pinned threads first, then by creation date
    return filtered.sort((a, b) => {
      // First sort by pinned status
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Then sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [threads, selectedCategory]);

  const fetchThreads = async () => {
    if (!community) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Get threads with profile data and category information
      const { data: threadsData, error } = await supabase
        .from("threads")
        .select(
          `
          *,
          profiles:user_id (
            avatar_url,
            full_name
          ),
          thread_categories:category_id (
            name,
            icon_type
          )
        `
        )
        .eq("community_id", community.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedThreads = threadsData.map((thread: any) => {
        const category = thread.thread_categories;
        return {
          id: thread.id,
          title: thread.title,
          content: thread.content,
          createdAt: thread.created_at,
          userId: thread.user_id,
          author: {
            name:
              thread.author_name || thread.profiles?.full_name || "Anonymous",
            image: thread.profiles?.avatar_url || thread.author_image || "",
          },
          category: category?.name || "General",
          category_type: category?.icon_type || null,
          categoryId: thread.category_id,
          likesCount: thread.likes?.length || 0,
          commentsCount: thread.comments?.length || 0,
          likes: thread.likes || [],
          comments: thread.comments || [],
          pinned: thread.pinned || false,
        };
      });

      setThreads(formattedThreads);
    } catch (error) {
      console.error("Error fetching threads:", error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <div>Error loading community: {error.message}</div>;
  }

  if (isLoading || !community) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
                        src={
                          members.find((m) => m.user_id === currentUser?.id)
                            ?.profile?.avatar_url ||
                          currentUser?.user_metadata?.avatar_url ||
                          ""
                        }
                        alt={
                          members.find((m) => m.user_id === currentUser?.id)
                            ?.profile?.full_name ||
                          currentUser?.user_metadata?.full_name ||
                          "User"
                        }
                      />
                      <AvatarFallback>
                        {(
                          members.find((m) => m.user_id === currentUser?.id)
                            ?.profile?.full_name?.[0] ||
                          currentUser?.user_metadata?.full_name?.[0] ||
                          "U"
                        ).toUpperCase()}
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
                    category={
                      thread.id === newThreadId
                        ? thread.category
                        : community.threadCategories?.find(
                            (cat) => cat.id === thread.categoryId
                          )?.name || "General"
                    }
                    category_type={
                      thread.id === newThreadId
                        ? thread.category_type
                        : community.threadCategories?.find(
                            (cat) => cat.id === thread.categoryId
                          )?.iconType
                    }
                    likes={thread.likes}
                    pinned={thread.pinned}
                    onClick={() => setSelectedThread(thread)}
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
                  <h2 className="text-xl font-semibold mb-2">
                    {community.name}
                  </h2>
                  <p className="text-sm mb-2">{community.description}</p>

                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{totalMembers} members</span>
                  </div>

                  <div className="space-y-2">
                    {community.customLinks?.map((link, index) => (
                      <Link
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-gray-600 hover:underline"
                      >
                        <ExternalLink className="inline-block w-4 h-4 mr-2" />
                        {link.title}
                      </Link>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center space-x-2">
                    {Array.isArray(members) && members.length > 0 ? (
                      <>
                        {members.slice(0, 5).map((member) => (
                          <div key={member.id}>
                            <div className="relative group/avatar">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={
                                    member.profile?.avatar_url ||
                                    "/placeholder-avatar.png"
                                  }
                                  alt={member.profile?.full_name || "Member"}
                                />
                                <AvatarFallback>
                                  {member.profile?.full_name?.[0]?.toUpperCase() ||
                                    member.user_id
                                      .substring(0, 2)
                                      .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {member.profile?.full_name || "Anonymous"}
                                {member.user_id === community.created_by
                                  ? " (Creator)"
                                  : ""}
                              </div>
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
                      <div className="text-sm text-gray-500">
                        No members yet
                      </div>
                    )}
                  </div>

                  {isCreator ? (
                    <Button
                      onClick={() => setShowSettingsModal(true)}
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
                      {community?.membershipEnabled &&
                      community?.membershipPrice &&
                      community?.stripeAccountId
                        ? `Join for €${community.membershipPrice}/month`
                        : "Join for free"}
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

      {/* Modals */}
      {selectedThread && (
        <ThreadModal
          thread={{
            id: selectedThread.id,
            user_id: selectedThread.userId,
            title: selectedThread.title,
            content: selectedThread.content,
            author: selectedThread.author,
            created_at: selectedThread.createdAt,
            likes_count: selectedThread.likesCount,
            comments_count: selectedThread.commentsCount,
            category: community.threadCategories?.find(
              (cat) => cat.id === selectedThread.categoryId
            )?.name || "General",
            category_type: community.threadCategories?.find(
              (cat) => cat.id === selectedThread.categoryId
            )?.iconType,
            likes: selectedThread.likes,
            comments: selectedThread.comments,
            pinned: selectedThread.pinned,
          }}
          isOpen={!!selectedThread}
          onClose={() => setSelectedThread(null)}
          onLikeUpdate={handleLikeUpdate}
          onCommentUpdate={handleCommentUpdate}
          onThreadUpdate={(threadId, updates) => {
            setThreads((prevThreads) =>
              prevThreads.map((thread) =>
                thread.id === threadId ? { ...thread, ...updates } : thread
              )
            );
          }}
          onDelete={(threadId) => {
            setThreads((prevThreads) =>
              prevThreads.filter((thread) => thread.id !== threadId)
            );
            setSelectedThread(null);
          }}
          isCreator={currentUser?.id === community.created_by}
        />
      )}

      <CommunitySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        communityId={community.id}
        communitySlug={communitySlug}
        communityName={community.name}
        communityDescription={community.description}
        imageUrl={community.imageUrl}
        customLinks={community.customLinks || []}
        stripeAccountId={community.stripeAccountId || null}
        threadCategories={community.threadCategories || []}
        onImageUpdate={(newImageUrl) => {
          setCommunity((prev) => ({ ...prev!, imageUrl: newImageUrl }));
        }}
        onCommunityUpdate={(updates) => {
          setCommunity((prev) => ({ ...prev!, ...updates }));
        }}
        onCustomLinksUpdate={(newLinks) => {
          setCommunity((prev) => ({ ...prev!, customLinks: newLinks }));
        }}
        onThreadCategoriesUpdate={(categories) => {
          setCommunity((prev) => ({ ...prev!, threadCategories: categories }));
        }}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        clientSecret={paymentClientSecret}
        stripeAccountId={stripeAccountId}
        price={community.membershipPrice || 0}
        onSuccess={() => {
          setIsMember(true);
          setShowPaymentModal(false);
          toast.success("Successfully joined the community!");
        }}
        communitySlug={communitySlug}
      />

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
            <AlertDialogAction onClick={handleLeaveCommunity}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
