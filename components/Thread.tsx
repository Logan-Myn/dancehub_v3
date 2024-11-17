"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageCircle,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { CATEGORY_ICONS } from "@/lib/constants";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-full min-h-[150px]',
      },
    },
  });

  const isCreator = user?.uid === community.createdBy;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!editor?.getHTML() || editor?.getHTML() === '<p></p>') {
      toast.error("Please write something before posting");
      return;
    }

    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/threads/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content: editor.getHTML(),
          communityId,
          userId,
          categoryId: selectedCategory,
          categoryName: community.threadCategories?.find(
            (cat: { id: string; name: string }) => cat.id === selectedCategory
          )?.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create thread");
      }

      const newThread = await response.json();
      toast.success("Thread created successfully");
      editor?.commands.clearContent();
      setTitle("");
      setSelectedCategory("");
      onSave(newThread);
    } catch (error) {
      console.error("Error creating thread:", error);
      toast.error("Failed to create thread");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with user info and category selection */}
      <div className="flex items-center space-x-2">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={user?.photoURL || ""}
            alt={user?.displayName || "User"}
          />
          <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="text-sm flex items-center space-x-2">
          <span className="font-medium">{user?.displayName}</span>
          <span className="text-gray-500">posting in</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px] border-none bg-transparent hover:bg-gray-50 focus:ring-0">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {community.threadCategories
                ?.filter((category: { creatorOnly: boolean }) => !category.creatorOnly || isCreator)
                .map((category: any) => {
                  const iconConfig = CATEGORY_ICONS.find(
                    (i) => i.label === category.iconType
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

      {/* Updated Editor toolbar with text alignment */}
      <div className="flex items-center space-x-2 border-b pb-2">
        <div className="flex items-center space-x-2 pr-4 border-r">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={editor?.isActive('bold') ? 'bg-gray-200' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={editor?.isActive('italic') ? 'bg-gray-200' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 pr-4 border-r">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={editor?.isActive('bulletList') ? 'bg-gray-200' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={editor?.isActive('orderedList') ? 'bg-gray-200' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={editor?.isActive('blockquote') ? 'bg-gray-200' : ''}
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        {/* New text alignment buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            className={editor?.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            className={editor?.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            className={editor?.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
            className={editor?.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* TipTap Editor */}
      <div className="min-h-[200px] w-full rounded-lg border border-input bg-background p-3">
        <EditorContent editor={editor} />
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          CANCEL
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          {isSubmitting ? "Posting..." : "POST"}
        </Button>
      </div>
    </div>
  );
}
