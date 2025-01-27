"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-5xl font-bold mb-6">
                  Transform Your Dance Teaching Into a Thriving Online Business
                </h1>
                <p className="text-xl mb-8">
                  Join our platform to reach students worldwide, monetize your expertise, and build your dance teaching brand.
                </p>
                <div className="space-x-4">
                  <Link href="/community/onboarding">
                    <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                      Start Teaching Today
                    </Button>
                  </Link>
                  <Link href="/discovery">
                    <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                      Explore Communities
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative h-[500px] w-full flex items-center justify-center">
                  <Image
                    src="/Teachers1-2-removebg-preview.png"
                    alt="Dance teachers performing a dance move"
                    fill
                    className="object-contain scale-110 hover:scale-105 transition-transform duration-300"
                    style={{ filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))' }}
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">Why Choose Our Platform?</h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Monetize Your Expertise</h3>
                <p className="text-gray-600">Set your own prices and earn from courses and exclusive content.</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Build Your Community</h3>
                <p className="text-gray-600">Create and grow your own dance community with dedicated tools and features.</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Powerful Teaching Tools</h3>
                <p className="text-gray-600">Access video hosting and student management tools all in one place.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gray-50 py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-8">Ready to Start Your Teaching Journey?</h2>
            <p className="text-xl text-gray-600 mb-8">Join dance teachers who are already growing their business online.</p>
            <Link href="/community/onboarding">
              <Button size="lg" className="bg-purple-600 text-white hover:bg-purple-700">
                Create Your Community
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
