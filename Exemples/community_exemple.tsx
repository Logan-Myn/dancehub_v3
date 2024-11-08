"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCommunityBySlug,
  Community,
  joinCommunity,
  leaveCommunity,
  isCommunityMember,
  createThread,
  getThreads,
  Thread,
  getCommunityMembers,
  addCommentToThread,
  deleteCommentFromThread,
  likeComment,
  addReplyToComment,
  likeReply,
  deleteThread,
  updateCommunityPricing,
  getThreadCategories,
  pinThread,
} from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CommunitySettingsModal from "@/app/components/CommunitySettingsModal";
import ThreadComponent from "@/app/components/ThreadComponent";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { LinkIcon, GroupIcon, PinIcon, CurrencyIcon, UserCircle2, Search } from "lucide-react";
import CreateThreadModal from "@/app/components/CreateThreadModal";
import type { JSONContent } from "@/lib/editor-config";
import ThreadModal from "@/app/components/ThreadModal";
import { Timestamp } from "firebase/firestore";
import { Comment } from "@/lib/db";
import { loadStripe } from '@stripe/stripe-js';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { getDb, doc, getDoc } from '@/lib/db';
import CommunityNavbar from "@/app/components/CommunityNavbar";
import { useAuth } from "@/contexts/AuthContext";
import SignInModal from "@/app/components/auth/SignInModal";
import { fetchWithAuth } from '@/lib/utils';

// Add this type definition at the top of your file
type ThreadCategory = {
  id: string;
  name: string;
  membersCanPost: boolean; // Make this non-optional
};

export default function CommunityPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const userId = user?.uid;
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [members, setMembers] = useState<{ id: string; imageUrl: string }[]>(
    []
  );
  const [activeCategory, setActiveCategory] = useState("All");
  const router = useRouter();
  const [isCreateThreadModalOpen, setIsCreateThreadModalOpen] = useState(false);
  const [inputPosition, setInputPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'cancelling' | 'cancelled' | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{ currentPeriodEnd: Timestamp } | null>(null);
  const [threadCategories, setThreadCategories] = useState<ThreadCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchMemberData = useCallback(async (memberIds: string[]) => {
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberIds }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch member data");
      }
      const memberData = await response.json();
      return memberData;
    } catch (error) {
      console.error("Error fetching member data:", error);
      return [];
    }
  }, []);

  // Add this function to sort threads
  const sortThreads = (threads: Thread[]) => {
    return threads.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis();
    });
  };

  useEffect(() => {
    async function fetchData() {
      const communityData = await getCommunityBySlug(communitySlug);
      setCommunity(communityData);
      if (communityData) {
        const threadsData = await getThreads(communityData.id, selectedCategory || undefined);
        setThreads(sortThreads(threadsData));
        if (user?.uid) {
          const memberStatus = await isCommunityMember(
            communityData.id,
            user.uid
          );
          setIsMember(memberStatus);
        }
        // Fetch member data
        const memberIds = (await getCommunityMembers(communityData.id)).map(member => member.id);
        const memberData = await fetchMemberData(memberIds);
        setMembers(memberData);
        // Update the membersCount
        setCommunity(prev => prev ? {...prev, membersCount: memberIds.length} : null);

        // Fetch thread categories
        const categories = await getThreadCategories(communityData.id);
        setThreadCategories(categories as ThreadCategory[]);
      }
    }
    fetchData();
  }, [communitySlug, user?.uid, fetchMemberData, selectedCategory]);

  useEffect(() => {
    const checkMembershipStatus = async () => {
      if (user?.uid && community) {
        const memberStatus = await isCommunityMember(community.id, user.uid);
        setIsMember(memberStatus);
      }
    };

    const sessionId = searchParams?.get('session_id');

    if (sessionId) {
      checkMembershipStatus();
    }
  }, [user?.uid, community, searchParams]);

  useEffect(() => {
    async function handleSuccessfulPayment() {
      const sessionId = searchParams?.get('session_id');

      if (sessionId && user?.uid && community) {
        try {
          const response = await fetch('/api/stripe/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, userId: user.uid, communityId: community.id }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setIsMember(true);
              toast.success('Successfully joined the community!');
            } else {
              toast.error('Payment was not successful. Please try again or contact support.');
            }
          } else {
            throw new Error('Failed to verify payment');
          }
        } catch (error) {
          console.error('Error handling successful payment:', error);
          toast.error('An error occurred. Please try again or contact support.');
        }
      }
    }

    handleSuccessfulPayment();
  }, [searchParams, user?.uid, community]);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (user?.uid && community) {
        const firestore = getDb();
        const subscriptionRef = doc(firestore, 'users', user.uid, 'subscriptions', community.id);
        const subscriptionDoc = await getDoc(subscriptionRef);
        if (subscriptionDoc.exists()) {
          const subscriptionData = subscriptionDoc.data();
          console.log('Subscription data:', subscriptionData); // Add this line
          setSubscriptionStatus(subscriptionData.status);
          setSubscriptionData(subscriptionData as { currentPeriodEnd: Timestamp });
        } else {
          console.log('No subscription found'); // Add this line
        }
      }
    };

    fetchSubscriptionStatus();
  }, [user?.uid, community]);

  const handleImageUpdate = useCallback((newImageUrl: string) => {
    setCommunity((prevCommunity) =>
      prevCommunity ? { ...prevCommunity, imageUrl: newImageUrl } : null
    );
  }, []);

  const handleJoinCommunity = useCallback(async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (community) {
      if (community.price) {
        try {
          const response = await fetchWithAuth('/api/stripe/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ communityId: community.id, userId: user.uid }),
          });

          if (!response.ok) {
            throw new Error('Failed to create checkout session');
          }

          const { sessionId, accountId, publicKey } = await response.json();
          const stripe = await loadStripe(publicKey, { stripeAccount: accountId });
          if (!stripe) {
            throw new Error('Failed to load Stripe');
          }
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirect error:', error);
            toast.error(error.message || 'An error occurred during checkout. Please try again.');
          }
        } catch (error) {
          console.error('Error joining paid community:', error);
          toast.error('Failed to join community. Please try again.');
        }
      } else {
        try {
          const response = await fetchWithAuth('/api/community/join', {
            method: 'POST',
            body: JSON.stringify({ communityId: community.id }),
          });

          if (!response.ok) throw new Error('Failed to join community');
          setIsMember(true);
          toast.success('Successfully joined the community!');
        } catch (error) {
          console.error('Error joining community:', error);
          toast.error('Failed to join community. Please try again.');
        }
      }
    }
  }, [user, community, setIsAuthModalOpen]);

  const handleLeaveCommunity = useCallback(async () => {
    if (!user || !community) return;
    
    try {
      const response = await fetchWithAuth('/api/community/leave', {
        method: 'POST',
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!response.ok) throw new Error('Failed to leave community');
      setIsMember(false);
      toast.success('Successfully left the community');
    } catch (error) {
      console.error('Error leaving community:', error);
      toast.error('Failed to leave community. Please try again.');
    }
  }, [user, community]);

  const confirmLeaveCommunity = useCallback(async () => {
    if (user?.uid && community) {
      setIsCancellingSubscription(true);
      try {
        const cancelResponse = await fetch('/api/stripe/cancel-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.uid, communityId: community.id }),
        });

        if (!cancelResponse.ok) {
          throw new Error('Failed to cancel subscription');
        }

        await leaveCommunity(community.id, user.uid);
        setIsMember(false);
        toast.success('You have left the community and cancelled your subscription.');
      } catch (error) {
        console.error('Error leaving community or cancelling subscription:', error);
        toast.error('Failed to leave community or cancel subscription. Please try again.');
      } finally {
        setIsCancellingSubscription(false);
        setIsLeaveModalOpen(false);
      }
    }
  }, [user?.uid, community]);

  const handleCreateThread = async (title: string, content: JSONContent, categoryId: string, isPinned: boolean) => {
    if (user && community) {
      try {
        const newThread = await createThread(
          community.id,
          user.uid,
          user.displayName || user.email || "Anonymous",
          title,
          content,
          user.photoURL || "",
          categoryId,
          isPinned
        );
        setThreads((prevThreads) => [newThread as unknown as Thread, ...prevThreads]);
        toast.success("Thread created successfully!");
      } catch (error) {
        console.error("Error creating thread:", error);
        toast.error("Failed to create thread. Please try again.");
      }
    }
  };

  const handleReply = async (threadId: string, replyContent: string) => {
    console.log("Reply to thread", threadId, "with content:", replyContent);
    // Implement reply functionality here
  };

  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const closeSettingsModal = useCallback(
    () => setIsSettingsModalOpen(false),
    []
  );

  const handleCommunityUpdate = useCallback(
    (updates: { name?: string; description?: string; slug?: string }) => {
      setCommunity((prevCommunity) => {
        if (prevCommunity) {
          const updatedCommunity = { ...prevCommunity, ...updates };
          // If the slug has changed, redirect to the new URL
          if (updates.slug && updates.slug !== prevCommunity.slug) {
            router.push(`/community/${updates.slug}`);
          }
          return updatedCommunity;
        }
        return prevCommunity;
      });
    },
    [router]
  );

  const handleCustomLinksUpdate = useCallback(
    (newLinks: { title: string; url: string }[]) => {
      setCommunity((prevCommunity) => {
        if (prevCommunity) {
          return { ...prevCommunity, customLinks: newLinks };
        }
        return prevCommunity;
      });
    },
    []
  );

  const handleInputClick = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setInputPosition({
        top: rect.top + window.scrollY,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsCreateThreadModalOpen(true);
  }, []);

  const handleThreadClick = (thread: Thread) => {
    setSelectedThread(thread);
    setIsThreadModalOpen(true);
  };

  const handleLikeThread = async (threadId: string) => {
    if (user && community) {
      try {
        await fetch("/api/threads/like", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityId: community.id,
            threadId,
            userId: user.uid,
          }),
        });

        const updatedThreads = threads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                likes: thread.likedBy?.includes(user.uid)
                  ? (thread.likes || 0) - 1
                  : (thread.likes || 0) + 1,
                likedBy: thread.likedBy?.includes(user.uid)
                  ? thread.likedBy.filter((id) => id !== user.uid)
                  : [...(thread.likedBy || []), user.uid],
              }
            : thread
        );
        setThreads(updatedThreads);

        if (selectedThread && selectedThread.id === threadId) {
          setSelectedThread(
            updatedThreads.find((t) => t.id === threadId) || null
          );
        }
      } catch (error) {
        console.error("Error liking thread:", error);
        toast.error("Failed to like thread. Please try again.");
      }
    }
  };

  const handleComment = async (threadId: string, content: string) => {
    if (user && community) {
      try {
        const newComment = await addCommentToThread(
          community.id,
          threadId,
          user.uid,
          user.displayName || user.email || "Anonymous",
          user.photoURL || "",
          content
        );
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  comments: [...(thread.comments || []), newComment],
                }
              : thread
          )
        );

        if (selectedThread && selectedThread.id === threadId) {
          setSelectedThread((prevSelectedThread) => {
            if (prevSelectedThread) {
              return {
                ...prevSelectedThread,
                comments: [...(prevSelectedThread.comments || []), newComment],
              };
            }
            return null;
          });
        }
        toast.success("Comment added successfully!");
      } catch (error) {
        console.error("Error adding comment:", error);
        toast.error("Failed to add comment. Please try again.");
      }
    }
  };

  const handleDeleteComment = async (threadId: string, commentId: string) => {
    if (user && community) {
      try {
        await deleteCommentFromThread(community.id, threadId, commentId);

        const deleteCommentOrReply = (comments: Comment[]): Comment[] => {
          return comments.reduce((acc, comment) => {
            if (comment.id === commentId) {
              // Skip this comment (delete it)
              return acc;
            }
            if (comment.replies) {
              // Recursively check replies
              comment.replies = deleteCommentOrReply(comment.replies);
            }
            return [...acc, comment];
          }, [] as Comment[]);
        };

        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  comments: deleteCommentOrReply(thread.comments || []),
                }
              : thread
          )
        );

        if (selectedThread && selectedThread.id === threadId) {
          setSelectedThread((prevSelectedThread) => {
            if (prevSelectedThread) {
              return {
                ...prevSelectedThread,
                comments: deleteCommentOrReply(
                  prevSelectedThread.comments || []
                ),
              };
            }
            return prevSelectedThread;
          });
        }
        toast.success("Comment deleted successfully!");
      } catch (error) {
        console.error("Error deleting comment:", error);
        toast.error("Failed to delete comment. Please try again.");
      }
    }
  };

  const handleLikeComment = async (threadId: string, commentId: string) => {
    if (user && community) {
      try {
        const updatedComment = await likeComment(
          community.id,
          threadId,
          commentId,
          user.uid
        );
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  comments: thread.comments?.map((comment) =>
                    comment.id === commentId ? updatedComment : comment
                  ) as Comment[],
                }
              : thread
          )
        );

        if (selectedThread && selectedThread.id === threadId) {
          setSelectedThread((prevSelectedThread: Thread | null) => {
            if (prevSelectedThread) {
              return {
                ...prevSelectedThread,
                comments: prevSelectedThread.comments
                  ? prevSelectedThread.comments.map((comment) =>
                      comment.id === commentId && updatedComment
                        ? {
                            ...comment,
                            ...(updatedComment as unknown as object),
                          }
                        : comment
                    )
                  : [], // Fallback to an empty array if comments is undefined
              };
            }
            return null; // Return null if prevSelectedThread is not defined
          });
        }
      } catch (error) {
        console.error("Error liking comment:", error);
        toast.error("Failed to like comment. Please try again.");
      }
    }
  };

  const handleAddReply = async (
    threadId: string,
    commentId: string,
    content: string
  ) => {
    if (user && community) {
      try {
        const newReply = await addReplyToComment(
          community.id,
          threadId,
          commentId,
          content,
          user.uid,
          user.displayName || user.email || "Anonymous",
          user.photoURL || ""
        );

        // Update local state
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  comments: updateCommentsWithNewReply(
                    thread.comments || [],
                    commentId,
                    newReply
                  ),
                }
              : thread
          )
        );

        // Update selectedThread if necessary
        if (selectedThread && selectedThread.id === threadId) {
          setSelectedThread((prevSelectedThread) => {
            if (prevSelectedThread) {
              return {
                ...prevSelectedThread,
                comments: updateCommentsWithNewReply(
                  prevSelectedThread.comments || [],
                  commentId,
                  newReply
                ),
              };
            }
            return prevSelectedThread;
          });
        }

        toast.success("Reply added successfully!");
      } catch (error) {
        console.error("Error adding reply:", error);
        toast.error("Failed to add reply. Please try again.");
      }
    }
  };

  // Helper function to recursively update comments with new reply
  const updateCommentsWithNewReply = (
    comments: Comment[],
    targetCommentId: string,
    newReply: Comment
  ): Comment[] => {
    return comments.map((comment) => {
      if (comment.id === targetCommentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentsWithNewReply(
            comment.replies,
            targetCommentId,
            newReply
          ),
        };
      }
      return comment;
    });
  };

  const handleLikeReply = async (
    threadId: string,
    commentId: string,
    replyId: string
  ) => {
    if (user && community) {
      try {
        await likeReply(community.id, threadId, commentId, replyId, user.uid);

        const updateRepliesRecursively = (items: Comment[]): Comment[] => {
          return items.map((item) => {
            if (item.id === replyId) {
              return {
                ...item,
                likes: item.likedBy?.includes(user.uid)
                  ? (item.likes || 1) - 1
                  : (item.likes || 0) + 1,
                likedBy: item.likedBy?.includes(user.uid)
                  ? item.likedBy.filter((id) => id !== user.uid)
                  : [...(item.likedBy || []), user.uid],
              };
            }
            if (item.replies) {
              return {
                ...item,
                replies: updateRepliesRecursively(item.replies),
              };
            }
            return item;
          });
        };

        // Update local state
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  comments: updateRepliesRecursively(thread.comments || []),
                }
              : thread
          )
        );

        // Update selectedThread if necessary
        if (selectedThread && selectedThread.id === threadId) {
          setSelectedThread((prevSelectedThread) =>
            prevSelectedThread
              ? {
                  ...prevSelectedThread,
                  comments: updateRepliesRecursively(
                    prevSelectedThread.comments || []
                  ),
                }
              : prevSelectedThread
          );
        }
      } catch (error) {
        console.error("Error liking reply:", error);
        toast.error("Failed to like reply. Please try again.");
      }
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (user && community) {
      try {
        await deleteThread(community.id, threadId);
        setThreads((prevThreads) =>
          prevThreads.filter((thread) => thread.id !== threadId)
        );
        toast.success("Thread deleted successfully!");
      } catch (error) {
        console.error("Error deleting thread:", error);
        toast.error("Failed to delete thread. Please try again.");
      }
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(price);
  };

  const handlePricingUpdate = async (pricing: { price: number; currency: string; subscriptionInterval: 'week' | 'month' | 'year' }) => {
    if (!community) {
      console.error("Community is null");
      toast.error("Failed to update pricing. Community not found.");
      return;
    }

    try {
      await updateCommunityPricing(community.id, pricing);
      setCommunity(prev => prev ? { ...prev, ...pricing } : null);
      toast.success("Pricing updated successfully!");
    } catch (error) {
      console.error("Error updating pricing:", error);
      toast.error("Failed to update pricing. Please try again.");
    }
  };

  const handleResumeSubscription = useCallback(async () => {
    if (user?.uid && community) {
      try {
        const response = await fetch('/api/stripe/resume-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.uid, communityId: community.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to resume subscription');
        }

        setSubscriptionStatus('active');
        toast.success('Your subscription has been resumed.');
      } catch (error) {
        console.error('Error resuming subscription:', error);
        toast.error('Failed to resume subscription. Please try again.');
      }
    }
  }, [user?.uid, community]);

  const handleCategorySelect = async (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (community) {
      const threadsData = await getThreads(community.id, categoryId || undefined);
      setThreads(threadsData);
    }
  };

  const handlePinThread = async (threadId: string) => {
    if (user && community) {
      try {
        await pinThread(community.id, threadId);
        setThreads(prevThreads => {
          const updatedThreads = prevThreads.map(thread =>
            thread.id === threadId ? { ...thread, isPinned: !thread.isPinned } : thread
          );
          const sortedThreads = sortThreads(updatedThreads);
          const pinnedThread = sortedThreads.find(thread => thread.id === threadId);
          toast.success(pinnedThread?.isPinned ? "Thread pinned" : "Thread unpinned");
          return sortedThreads;
        });
      } catch (error) {
        console.error("Error pinning/unpinning thread:", error);
        toast.error("Failed to pin/unpin thread. Please try again.");
      }
    }
  };

  if (!community) {
    return <div>Loading...</div>;
  }

  const isCreator = user?.uid === community.createdBy;

  const pinnedThreads = threads.filter(thread => thread.isPinned);
  const unpinnedThreads = threads.filter(thread => !thread.isPinned);

  return (
    <div className={`flex flex-col min-h-screen bg-gray-100 ${
      isCreateThreadModalOpen ? "overflow-hidden" : ""
    }`}>
      <CommunityNavbar 
        communitySlug={communitySlug}
        activePage="community"
      />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex space-x-8">
            <div className="w-3/4">
              <div className="bg-white shadow-md rounded-lg p-4 mb-6">
                <div 
                  ref={inputRef}
                  onClick={handleInputClick}
                  className="flex items-center space-x-4 cursor-pointer"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <UserCircle2 className="w-10 h-10 text-gray-400" />
                  )}
                  <div className="flex-grow border-b border-gray-300 pb-2">
                    <span className="text-gray-500 font-roboto text-xl">Write something...</span>
                  </div>
                </div>
              </div>

              <div className="mb-6 flex space-x-2 overflow-x-auto">
                <button
                  onClick={() => handleCategorySelect(null)}
                  className={`px-4 py-2 rounded-full ${
                    selectedCategory === null ? 'bg-black text-white' : 'bg-gray-200'
                  }`}
                >
                  All
                </button>
                {threadCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`px-4 py-2 rounded-full ${
                      selectedCategory === category.id ? 'bg-black text-white' : 'bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {sortThreads(threads).map((thread) => (
                  <ThreadComponent
                    key={thread.id}
                    thread={thread}
                    onThreadClick={handleThreadClick}
                    onLike={handleLikeThread}
                    onLikeComment={handleLikeComment}
                    onDelete={handleDeleteThread}
                    onPin={handlePinThread}
                    categories={threadCategories}
                    isCreator={user?.uid === community?.createdBy}
                  />
                ))}
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
                    <GroupIcon className="h-4 w-4 mr-1" />
                    <span>{community.membersCount} members</span>
                  </div>
                  {community.price && community.currency && (
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <CurrencyIcon className="h-4 w-4 mr-1" />
                      <span>
                        {formatPrice(community.price, community.currency)}
                        {community.subscriptionType === 'recurring' && `/${community.subscriptionInterval}`}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {community.customLinks?.map((link, index) => (
                      <Link
                        key={index}
                        href={link.url}
                        className="block text-sm text-gray-600 hover:underline"
                      >
                        <LinkIcon className="inline-block w-4 h-4 mr-2" />
                        {link.title}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    {members.slice(0, 5).map((member) => (
                      <img
                        key={member.id}
                        src={member.imageUrl}
                        alt="Member"
                        className="w-8 h-8 rounded-full"
                      />
                    ))}
                    {members.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                        +{members.length - 5}
                      </div>
                    )}
                  </div>
                  {isCreator ? (
                    <Button
                      onClick={openSettingsModal}
                      className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
                    >
                      Manage Community
                    </Button>
                  ) : isMember ? (
                    <div>
                      {subscriptionStatus === 'cancelling' && subscriptionData && (
                        <div className="mb-4">
                          <p className="text-yellow-600 mb-2">
                            Your subscription will end on {new Date(subscriptionData.currentPeriodEnd.toDate()).toLocaleDateString()}. 
                            You'll have access until then.
                          </p>
                          <Button
                            onClick={handleResumeSubscription}
                            className="w-full bg-green-500 hover:bg-green-600 text-white"
                          >
                            Resume Subscription
                          </Button>
                        </div>
                      )}
                      {subscriptionStatus !== 'cancelling' && (
                        <Button
                          onClick={handleLeaveCommunity}
                          className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white"
                        >
                          Leave Community
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={handleJoinCommunity}
                      className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
                    >
                      {community.price && community.currency
                        ? `Join for ${formatPrice(community.price, community.currency)}`
                        : 'Join Community'}
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

      <CreateThreadModal
        isOpen={isCreateThreadModalOpen}
        onClose={() => setIsCreateThreadModalOpen(false)}
        onCreateThread={handleCreateThread}
        inputPosition={inputPosition}
        threadCategories={threadCategories}
        communityName={community.name}
        isCreator={user?.uid === community.createdBy}
      />

      <CommunitySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        communityId={community?.id || ""}
        communitySlug={communitySlug}
        communityName={community?.name || ""}
        communityDescription={community?.description || ""}
        imageUrl={community?.imageUrl || ""}
        onImageUpdate={handleImageUpdate}
        onCommunityUpdate={handleCommunityUpdate}
        customLinks={community?.customLinks || []}
        onCustomLinksUpdate={handleCustomLinksUpdate}
        stripeConnectedAccountId={community?.stripeConnectedAccountId || null}
        price={community?.price}
        currency={community?.currency}
        subscriptionInterval={community?.subscriptionInterval as "week" | "month" | "year" | undefined}
        onPricingUpdate={handlePricingUpdate}
      />

      {selectedThread && (
        <ThreadModal
          isOpen={isThreadModalOpen}
          onClose={() => setIsThreadModalOpen(false)}
          thread={selectedThread}
          onLike={handleLikeThread}
          onComment={handleComment}
          onDeleteComment={handleDeleteComment}
          onLikeComment={handleLikeComment}
          onAddReply={handleAddReply}
          onLikeReply={handleLikeReply}
          categories={threadCategories} // Add this line
        />
      )}

      <ConfirmationModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={confirmLeaveCommunity}
        title="Leave Community"
        message="Are you sure you want to leave this community? Your subscription will be cancelled at the end of the current billing period."
        confirmText="Yes, leave and cancel subscription"
        cancelText="No, stay in the community"
      />

      <SignInModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
