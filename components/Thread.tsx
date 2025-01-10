"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { CATEGORY_ICONS } from "@/lib/constants";
import Editor from "./Editor";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { createClient } from "@/lib/supabase";

interface ThreadProps {
  communityId: string;
  userId: string;
  communityName: string;
  community: any;
  onSave: (newThread: any) => void;
  onCancel: () => void;
}

export default function Thread({
  communityId,
  userId,
  communityName,
  community,
  onSave,
  onCancel,
}: ThreadProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const supabase = createClient();

  const isCreator = user?.id === community.created_by;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your post here...',
      }),
    ],
    immediatelyRender: false,
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!content || content === '<p></p>') {
      toast.error("Please write something before posting");
      return;
    }

    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    if (!user) {
      toast.error("Please sign in to create a thread");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch("/api/threads/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content,
          communityId,
          userId: user.id,
          categoryId: selectedCategory,
          categoryName: community.thread_categories?.find(
            (cat: { id: string; name: string }) => cat.id === selectedCategory
          )?.name,
          author: {
            id: user.id,
            name: user.user_metadata?.full_name || 'Anonymous',
            avatar_url: user.user_metadata?.avatar_url,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create thread');
      }

      const newThread = await response.json();
      toast.success("Thread created successfully");
      setContent("");
      setTitle("");
      setSelectedCategory("");
      onSave(newThread);
    } catch (error) {
      console.error("Error creating thread:", error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to create a thread');
      } else {
        toast.error('Failed to create thread. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous';
  const userAvatarUrl = user?.user_metadata?.avatar_url;
  const userInitial = userDisplayName[0]?.toUpperCase() || 'A';

  return (
    <div className="space-y-4">
      {/* Header with user info and category selection */}
      <div className="flex items-center space-x-2">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={userAvatarUrl || ""}
            alt={userDisplayName}
          />
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <div className="text-sm flex items-center space-x-2">
          <span className="font-medium">{userDisplayName}</span>
          <span className="text-gray-500">posting in</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px] border-none bg-transparent hover:bg-gray-50 focus:ring-0">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {community.thread_categories
                ?.filter((category: { creator_only: boolean }) => !category.creator_only || isCreator)
                .map((category: any) => {
                  const iconConfig = CATEGORY_ICONS.find(
                    (i) => i.label === category.icon_type
                  );
                  const IconComponent = iconConfig?.icon || MessageCircle;

                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <IconComponent
                          className="h-4 w-4"
                          style={{ color: iconConfig?.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Title input */}
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-lg font-medium border-none bg-transparent px-0 focus:outline-none w-full"
      />

      {/* Editor Component */}
      <Editor
        content={content}
        onChange={(html) => setContent(html)}
        editable={true}
      />

      {/* Action buttons */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          CANCEL
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !user}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          {isSubmitting ? "Posting..." : "POST"}
        </Button>
      </div>
    </div>
  );
}
