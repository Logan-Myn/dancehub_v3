import { Suspense } from "react";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { Users, LinkIcon, CurrencyIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import CommunityNavbar from "@/components/CommunityNavbar";
import Navbar from "@/app/components/Navbar";
import ClientCommunityPage from "@/app/community/[communitySlug]/client-page";
import { ThreadCategory } from "@/types/community";

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

async function getCommunityData(communitySlug: string) {
  // Get community data
  const communitySnapshot = await adminDb
    .collection("communities")
    .where("slug", "==", communitySlug)
    .limit(1)
    .get();

  if (communitySnapshot.empty) {
    return null;
  }

  const communityDoc = communitySnapshot.docs[0];
  const data = communityDoc.data();
  
  // Ensure thread categories have the required color property
  const threadCategories = data.threadCategories?.map((cat: any) => ({
    ...cat,
    color: cat.color || "#000000", // Provide a default color if missing
  }));

  const communityData: Community = {
    id: communityDoc.id,
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    membersCount: data.members?.length || 0,
    createdBy: data.createdBy,
    price: data.price,
    currency: data.currency,
    customLinks: data.customLinks,
    stripeAccountId: data.stripeAccountId,
    membershipEnabled: data.membershipEnabled,
    membershipPrice: data.membershipPrice,
    threadCategories,
  };

  return communityData;
}

async function getMembers(communitySlug: string) {
  const communitySnapshot = await adminDb
    .collection("communities")
    .where("slug", "==", communitySlug)
    .limit(1)
    .get();

  if (communitySnapshot.empty) {
    return { members: [], totalMembers: 0 };
  }

  const communityRef = communitySnapshot.docs[0].ref;
  const communityData = communitySnapshot.docs[0].data();

  const membersSnapshot = await communityRef.collection("members").get();

  const memberIds = new Set([
    ...membersSnapshot.docs.map((doc) => doc.data().userId),
    ...(communityData.members || []),
  ]);

  const members = await Promise.all(
    Array.from(memberIds).map(async (userId) => {
      try {
        const user = await adminAuth.getUser(userId);
        return {
          id: userId,
          displayName: user.displayName || user.email?.split("@")[0] || "Anonymous",
          imageUrl: user.photoURL || "",
        };
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
      }
    })
  );

  const validMembers = members.filter((member) => member !== null);

  return {
    members: validMembers,
    totalMembers: validMembers.length,
  };
}

async function getThreads(communitySlug: string) {
  const communitiesSnapshot = await adminDb
    .collection("communities")
    .where("slug", "==", communitySlug)
    .limit(1)
    .get();

  if (communitiesSnapshot.empty) {
    return [];
  }

  const communityDoc = communitiesSnapshot.docs[0];

  const threadsSnapshot = await adminDb
    .collection("threads")
    .where("communityId", "==", communityDoc.id)
    .orderBy("createdAt", "desc")
    .get();

  const threads = await Promise.all(
    threadsSnapshot.docs.map(async (doc) => {
      const threadData = doc.data();
      const userRecord = await adminAuth.getUser(threadData.userId);

      return {
        id: doc.id,
        title: threadData.title,
        content: threadData.content,
        userId: threadData.userId,
        createdAt: threadData.createdAt,
        likesCount: threadData.likes?.length || 0,
        commentsCount: threadData.comments?.length || 0,
        category: threadData.category,
        categoryId: threadData.categoryId,
        author: {
          name: userRecord.displayName || "Anonymous",
          image: userRecord.photoURL || "",
        },
        likes: threadData.likes,
        comments: threadData.comments,
      };
    })
  );

  return threads;
}

export default async function CommunityPage({
  params,
}: {
  params: { communitySlug: string };
}) {
  const communitySlug = params.communitySlug;
  const communityData = await getCommunityData(communitySlug);
  const { members, totalMembers } = await getMembers(communitySlug);
  const threads = await getThreads(communitySlug);

  if (!communityData) {
    return <div>Community not found</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="community" />

      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <ClientCommunityPage
          community={communityData}
          initialMembers={members}
          initialTotalMembers={totalMembers}
          initialThreads={threads}
        />
      </Suspense>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
          © 2024 DanceHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
