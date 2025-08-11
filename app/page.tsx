"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navbar from "@/app/components/Navbar"; // Changed Header to Navbar
import { Footer } from "@/components/landing/footer";
import {
  Users,
  BookOpenText,
  CircleDollarSign,
  LayoutList,
  PlayCircle,
  Wallet,
  Star,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

const benefits = [
  {
    icon: Users,
    title: "Community Building",
    description:
      "Foster vibrant dance communities with interactive tools and seamless communication features.",
    image: "https://placehold.co/600x400.png",
    aiHint: "dance community",
  },
  {
    icon: BookOpenText,
    title: "Course Creation",
    description:
      "Easily design, upload, and manage your dance courses with our intuitive platform.",
    image: "https://placehold.co/600x400.png",
    aiHint: "online learning",
  },
  {
    icon: CircleDollarSign,
    title: "Smart Monetization",
    description:
      "Start with 0% platform fees for 30 days, then scale with competitive tiered pricing as you grow.",
    image: "https://placehold.co/600x400.png",
    aiHint: "earning money",
  },
];

const testimonials = [
  {
    quote:
      "DanceHub revolutionized how I connect with my students. The course creation tools are a game-changer!",
    name: "Elena Petrova",
    role: "Ballet Instructor",
    image: "https://placehold.co/100x100.png",
    aiHint: "woman smiling",
  },
  {
    quote:
      "Finally, a platform that understands the needs of dance teachers! Monetizing my classes has never been easier.",
    name: "Marcus Chen",
    role: "Hip Hop Choreographer",
    image: "https://placehold.co/100x100.png",
    aiHint: "man portrait",
  },
  {
    quote:
      "Building a supportive online community for my students has been incredible. DanceHub made it possible.",
    name: "Aisha Khan",
    role: "Contemporary Dance Coach",
    image: "https://placehold.co/100x100.png",
    aiHint: "person happy",
  },
];

const features = [
  {
    icon: Users,
    name: "Community Creation",
    description: "Engage members with forums, groups, and direct messaging.",
  },
  {
    icon: LayoutList,
    name: "Course Management",
    description:
      "Organize lessons, track progress, and deliver stunning content.",
  },
  {
    icon: PlayCircle,
    name: "Video Capabilities",
    description:
      "Host high-quality video lessons, live classes, and on-demand content.",
  },
  {
    icon: Wallet,
    name: "Monetization Tools",
    description:
      "Launch with zero platform fees, then grow with our fair tiered pricing model and secure payment processing.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [isBenefitsVisible, setIsBenefitsVisible] = useState(false);
  const benefitsSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsBenefitsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (benefitsSectionRef.current) {
      observer.observe(benefitsSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleTeachingClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!user) {
      e.preventDefault();
      showAuthModal("signup");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Promotional Banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 text-center">
        <p className="text-sm md:text-base font-medium">
          🎉 <span className="font-bold">Launch Special:</span> Zero platform fees for your first 30 days - Build your community risk-free!
        </p>
      </div>
      <Navbar /> {/* Changed Header to Navbar */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto text-center px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              <span className="block">Empower Your</span>
              <span className="block text-primary">Dance Community</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-10">
              DanceHub provides the ultimate platform for dance teachers to
              build, manage, and monetize their online classes and vibrant
              communities.
            </p>
            <Button
              size="lg"
              asChild
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-10 py-6 rounded-full shadow-lg transition-transform hover:scale-105"
            >
              <Link href="/onboarding" onClick={handleTeachingClick}>Start Your Community</Link>
            </Button>
          </div>
        </section>

        {/* Why DanceHub? */}
        <section
          ref={benefitsSectionRef}
          className="py-16 md:py-24"
        >
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-6 text-primary">
              Why DanceHub?
            </h2>
            <p className="text-lg text-center text-foreground/80 max-w-2xl mx-auto mb-16">
              Everything you need to succeed, all in one place.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature) => (
                <Card
                  key={feature.name}
                  className="p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <feature.icon className="w-12 h-12 text-accent mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-primary">
                    {feature.name}
                  </h3>
                  <p className="text-foreground/80 text-sm">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section - Commented out until we have testimonials */}
        {/* 
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16 text-primary">
              Loved by Dance Teachers
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <Card
                  key={testimonial.name}
                  className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col p-6 items-center text-center"
                >
                  <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-primary/50">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      sizes="96px"
                      data-ai-hint={testimonial.aiHint}
                    />
                  </div>
                  <blockquote className="text-foreground/80 mb-4 italic flex-grow">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex mt-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="font-semibold text-primary">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>
        */}

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto text-center px-4">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-primary">
              Ready to Build Your Dance Community?
            </h2>
            <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-10">
              Join DanceHub today and start connecting with dancers around the world.
            </p>
            <Button
              size="lg"
              asChild
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-10 py-6 rounded-full shadow-lg transition-transform hover:scale-105"
            >
              <Link href="/onboarding" onClick={handleTeachingClick}>Start Your Community</Link>
            </Button>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
