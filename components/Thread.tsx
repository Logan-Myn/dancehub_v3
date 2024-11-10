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
  GiftIcon 
} from 'lucide-react';

interface ThreadProps {
  communityId: string;
  userId: string;
  communityName: string;
  onSave: (newThread: any) => void;
  onCancel: () => void;
}

export default function Thread({ 
  communityId, 
  userId, 
  communityName,
  onSave, 
  onCancel 
}: ThreadProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      const newThread = await response.json();

      toast.success('Thread created successfully');
      editor.commands.clearContent();
      setTitle('');
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
      {/* Header with user info and posting info */}
      <div className="flex items-center space-x-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
          <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <span className="font-medium">{user?.displayName}</span>
          <span className="text-gray-500"> posting in </span>
          <span className="font-medium">{communityName}</span>
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
          <button className="text-gray-500 hover:text-gray-700">
            <GiftIcon className="h-5 w-5" />
          </button>
          <div className="text-sm text-gray-500">
            Select a category ▼
          </div>
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