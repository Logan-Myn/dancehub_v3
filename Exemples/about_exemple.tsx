"use client";

import { useState, useEffect, useCallback } from 'react';
import { getCommunityBySlug, Community, updateCommunityAboutContent, getCommunityMembers } from '@/lib/db';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { JSONContent } from "@tiptap/react";
import CommunityNavbar from "@/app/components/CommunityNavbar";
import { LinkIcon, GroupIcon, CurrencyIcon, UserCircle2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';

export default function AboutPage() {
  const params = useParams();
  const communitySlug = params?.communitySlug as string;
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAboutContent, setEditedAboutContent] = useState<JSONContent | null>(null);
  const [members, setMembers] = useState<{ id: string; imageUrl: string }[]>([]);

  const parseContent = useCallback((content: string): JSONContent => {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: content }],
          },
        ],
      };
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const communityData = await getCommunityBySlug(communitySlug);
        setCommunity(communityData);
        setEditedAboutContent(communityData?.aboutContent ? parseContent(communityData.aboutContent) : null);
        // Fetch member data
        if (communityData) {
          const memberIds = (await getCommunityMembers(communityData.id)).map(member => member.id);
          const memberData = await fetchMemberData(memberIds);
          setMembers(memberData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load community data');
      }
    }
    if (communitySlug) {
      fetchData();
    }
  }, [communitySlug, parseContent]);

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

  const handleSaveAboutContent = useCallback(async () => {
    if (community && editedAboutContent) {
      const contentString = JSON.stringify(editedAboutContent);
      await updateCommunityAboutContent(community.id, contentString);
      setCommunity({ ...community, aboutContent: contentString });
      setIsEditing(false);
    }
  }, [community, editedAboutContent]);

  if (!community) {
    return <div>Loading...</div>;
  }

  const isCreator = user?.uid === community.createdBy;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <CommunityNavbar 
        communitySlug={communitySlug}
        activePage="about"
      />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex space-x-8">
            <div className="w-3/4">
              <h1 className="text-3xl font-bold mb-6">{community.name} - About</h1>
              
              <div className="bg-white rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">About Our Community</h2>
                {isEditing ? (
                  <>
                    <TailwindAdvancedEditor
                      initialContent={editedAboutContent}
                      onUpdate={(editor) => {
                        setEditedAboutContent(editor.getJSON());
                      }}
                    />
                    <div className="mt-4">
                      <Button onClick={handleSaveAboutContent} className="mr-2">Save</Button>
                      <Button onClick={() => setIsEditing(false)} variant="outline">Cancel</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="prose max-w-none">
                      {community.aboutContent ? (
                        <TailwindAdvancedEditor
                          initialContent={parseContent(community.aboutContent)}
                          editable={false}
                        />
                      ) : (
                        <p>No about content available.</p>
                      )}
                    </div>
                    {isCreator && (
                      <Button onClick={() => setIsEditing(true)} className="mt-4">Edit About Content</Button>
                    )}
                  </>
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
                    <GroupIcon className="h-4 w-4 mr-1" />
                    <span>{community.membersCount} members</span>
                  </div>
                  {community.price && community.currency && (
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <CurrencyIcon className="h-4 w-4 mr-1" />
                      <span>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: community.currency }).format(community.price)}
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
    </div>
  );
}

function NavItem({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-${active ? 'gray-900 font-semibold' : 'gray-500 hover:text-gray-900'}`}
    >
      {children}
    </Link>
  );
}
