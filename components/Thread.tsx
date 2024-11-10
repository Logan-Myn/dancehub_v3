"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Paperclip, 
  Link2, 
  Video, 
  BarChart2, 
  Smile, 
  MessageCircle,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CATEGORY_ICONS } from "@/lib/constants";

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
  onCancel 
}: ThreadProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { user } = useAuth();

  const editor = useEditor({
    extensions: [StarterKit],
    editorProps: {
      attributes: {
        class: 'min-h-[150px] w-full rounded-md px-3 py-2 text-sm focus:outline-none',
      },
    },
    content: '',
  });

  const handleSubmit = async () => {
    if (!editor?.getText().trim()) {
      toast.error('Please write something before posting');
      return;
    }

    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/threads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error('Failed to create thread');
      }

      const newThread = await response.json();

      toast.success('Thread created successfully');
      editor.commands.clearContent();
      setTitle('');
      setSelectedCategory('');
      onSave(newThread);
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to create thread');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with user info and category selection */}
      <div className="flex items-center space-x-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
          <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="text-sm flex items-center space-x-2">
          <span className="font-medium">{user?.displayName}</span>
          <span className="text-gray-500">posting in</span>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[200px] border-none bg-transparent hover:bg-gray-50 focus:ring-0">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {community.threadCategories?.map((category: any) => {
                const iconConfig = CATEGORY_ICONS.find(i => i.label === category.iconType);
                const IconComponent = iconConfig?.icon || MessageCircle;
                
                if (category.creatorOnly && community.createdBy !== userId) {
                  return null;
                }
                
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
      <Input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-lg font-medium border-none bg-transparent px-0 focus-visible:ring-0"
      />

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-700">
            <Paperclip className="h-5 w-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Link2 className="h-5 w-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Video className="h-5 w-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <BarChart2 className="h-5 w-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Smile className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            {isSubmitting ? 'Posting...' : 'POST'}
          </Button>
        </div>
      </div>
    </div>
  );
} 