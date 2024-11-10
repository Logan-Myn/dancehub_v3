"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare, MoreVertical, Edit2, Trash } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Comment from "./Comment";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "./ui/input";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface ThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: {
    id: string;
    userId: string;
    title: string;
    content: string;
    author: {
      name: string;
      image: string;
    };
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    category?: string;
    categoryType?: string;
    likes?: string[];
    comments?: {
      id: string;
      content: string;
      author: {
        name: string;
        image: string;
      };
      createdAt: string;
    }[];
  };
  onLikeUpdate: (threadId: string, newLikesCount: number, liked: boolean) => void;
  onCommentUpdate?: (threadId: string, newComment: any) => void;
  onThreadUpdate?: (threadId: string, updates: { title: string; content: string }) => void;
}

export default function ThreadModal({ isOpen, onClose, thread, onLikeUpdate, onCommentUpdate, onThreadUpdate }: ThreadModalProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const isLiked = user ? thread.likes?.includes(user.uid) : false;
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(thread.title);
  const [editedContent, setEditedContent] = useState(thread.content);
  const isOwner = user?.uid === thread.userId;

  const formattedAuthorName = formatDisplayName(thread.author.name);
  const iconConfig = CATEGORY_ICONS.find(i => i.label === thread.categoryType);
  const IconComponent = iconConfig?.icon || MessageSquare;

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: thread.content,
    editorProps: {
      attributes: {
        class: 'min-h-[150px] w-full rounded-md px-3 py-2 text-sm focus:outline-none prose prose-sm max-w-none',
      },
    },
  });

  // Update editor content and editable state when needed
  useEffect(() => {
    if (editor) {
      editor.commands.setContent(thread.content);
      editor.setEditable(isEditing);
    }
  }, [thread.content, editor, isEditing]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to like threads');
      return;
    }

    try {
      const response = await fetch(`/api/threads/${thread.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) throw new Error('Failed to like thread');

      const data = await response.json();
      onLikeUpdate(thread.id, data.likesCount, data.liked);
    } catch (error) {
      console.error('Error liking thread:', error);
      toast.error('Failed to like thread');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!comment.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/threads/${thread.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: comment,
          userId: user.uid,
        }),
      });

      if (!response.ok) throw new Error('Failed to post comment');

      const newComment = await response.json();
      
      onCommentUpdate?.(thread.id, newComment);
      
      setComment('');
      toast.success('Comment posted successfully');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editor) return;

    try {
      const response = await fetch(`/api/threads/${thread.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedTitle,
          content: editor.getHTML(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update thread');

      onThreadUpdate?.(thread.id, {
        title: editedTitle,
        content: editor.getHTML(),
      });

      setIsEditing(false);
      toast.success('Thread updated successfully');
    } catch (error) {
      console.error('Error updating thread:', error);
      toast.error('Failed to update thread');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(thread.title);
    editor?.commands.setContent(thread.content);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <div className="p-6">
          {/* Author info and metadata */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={thread.author.image} alt={formattedAuthorName} />
                <AvatarFallback>{formattedAuthorName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{formattedAuthorName}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(thread.createdAt))} ago
                  </span>
                  {thread.category && (
                    <>
                      <span className="text-gray-500">in</span>
                      <div className="flex items-center space-x-1">
                        <IconComponent 
                          className="h-4 w-4"
                          style={{ color: iconConfig?.color }}
                        />
                        <span style={{ color: iconConfig?.color }}>
                          {thread.category}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {user?.uid === thread.userId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Thread content */}
          {isEditing ? (
            <div className="space-y-4">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-xl font-semibold"
                placeholder="Thread title"
              />
              <EditorContent editor={editor} />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-4">{thread.title}</h2>
              <EditorContent editor={editor} />
            </>
          )}

          {/* Interaction buttons */}
          <div className="flex items-center space-x-4 text-gray-500 border-t pt-4">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1 hover:text-blue-500 transition-colors ${
                isLiked ? 'text-blue-500' : ''
              }`}
            >
              <ThumbsUp className="h-5 w-5" />
              <span>{thread.likesCount}</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-gray-700">
              <MessageSquare className="h-5 w-5" />
              <span>{thread.commentsCount}</span>
            </button>
          </div>

          {/* Comments section */}
          <div className="mt-6 border-t pt-6">
            <h3 className="font-medium mb-4">Comments</h3>

            {/* Comment input */}
            <div className="flex items-start space-x-3 mb-6">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <form onSubmit={handleSubmitComment} className="flex-1">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[80px] mb-2"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !comment.trim()}
                    size="sm"
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Comments list */}
            <div className="space-y-4">
              {thread.comments?.map((comment) => (
                <Comment
                  key={comment.id}
                  author={comment.author}
                  content={comment.content}
                  createdAt={comment.createdAt}
                />
              ))}
              {!thread.comments?.length && (
                <p className="text-gray-500 text-sm text-center">No comments yet</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 