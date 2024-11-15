"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/components/Navbar";
import CommunityNavbar from "@/components/CommunityNavbar";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Users, MessageCircle, BookOpen, Star } from "lucide-react";
import Image from "next/image";

interface Community {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  membersCount: number;
  createdBy: string;
  customLinks?: { title: string; url: string }[];
  membershipEnabled?: boolean;
  membershipPrice?: number;
}

interface Testimonial {
  id: string;
  content: string;
  author: {
    name: string;
    image: string;
    role?: string;
  };
}

export default function AboutPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Example testimonials (you can fetch these from your database later)
  const testimonials: Testimonial[] = [
    {
      id: "1",
      content: "This community has transformed my dance journey. The support and knowledge sharing are incredible!",
      author: {
        name: "Sarah Johnson",
        image: "/testimonials/sarah.jpg",
        role: "Dance Enthusiast"
      }
    },
    // Add more testimonials...
  ];

  useEffect(() => {
    async function fetchCommunityData() {
      try {
        const communityData = await fetch(`/api/community/${communitySlug}`).then(res => res.json());
        setCommunity(communityData);

        if (user?.uid) {
          const membershipStatus = await fetch(
            `/api/community/${communitySlug}/membership/${user.uid}`
          ).then(res => res.json());
          setIsMember(membershipStatus.isMember);
        }
      } catch (error) {
        console.error("Error fetching community data:", error);
        toast.error("Failed to load community data");
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
      toast.error("Please sign in to join the community");
      return;
    }

    try {
      if (community?.membershipEnabled && community?.membershipPrice) {
        setShowPaymentModal(true);
      } else {
        const response = await fetch(`/api/community/${communitySlug}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        });

        if (!response.ok) throw new Error("Failed to join community");

        setIsMember(true);
        toast.success("Successfully joined the community!");
      }
    } catch (error) {
      console.error("Error joining community:", error);
      toast.error("Failed to join community");
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

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <CommunityNavbar communitySlug={communitySlug} activePage="about" />

      {/* Hero Section */}
      <div className="relative h-[400px] bg-gray-900">
        {community.imageUrl && (
          <Image
            src={community.imageUrl}
            alt={community.name}
            fill
            className="object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">{community.name}</h1>
            <p className="text-xl max-w-2xl mx-auto mb-8">{community.description}</p>
            {!isMember && (
              <Button
                onClick={handleJoinCommunity}
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100"
              >
                {community.membershipPrice
                  ? `Join for €${community.membershipPrice}/month`
                  : "Join Community"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-xl font-semibold mb-2">Community Discussions</h3>
              <p className="text-gray-600">Engage in meaningful conversations with fellow dancers</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">Learning Resources</h3>
              <p className="text-gray-600">Access exclusive tutorials and educational content</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-purple-500" />
              <h3 className="text-xl font-semibold mb-2">Network</h3>
              <p className="text-gray-600">Connect with dancers from around the world</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Members Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center mb-4">
                  <Image
                    src={testimonial.author.image}
                    alt={testimonial.author.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div className="ml-4">
                    <h4 className="font-semibold">{testimonial.author.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.author.role}</p>
                  </div>
                </div>
                <p className="text-gray-600">{testimonial.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join Our Community?</h2>
          <p className="text-xl mb-8">Start your journey with us today!</p>
          {!isMember && (
            <Button
              onClick={handleJoinCommunity}
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              {community.membershipPrice
                ? `Join for €${community.membershipPrice}/month`
                : "Join Community"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
} 