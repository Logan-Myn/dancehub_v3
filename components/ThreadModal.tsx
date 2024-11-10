"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Comment from "./Comment";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

interface ThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: {
    id: string;
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
}

export default function ThreadModal({ isOpen, onClose, thread, onLikeUpdate, onCommentUpdate }: ThreadModalProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const isLiked = user ? thread.likes?.includes(user.uid) : false;
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formattedAuthorName = formatDisplayName(thread.author.name);
  const iconConfig = CATEGORY_ICONS.find(i => i.label === thread.categoryType);
  const IconComponent = iconConfig?.icon || MessageSquare;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <div className="p-6">
          {/* Author info and metadata */}
          <div className="flex items-center space-x-2 mb-4">
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

          {/* Thread content */}
          <h2 className="text-2xl font-semibold mb-4">{thread.title}</h2>
          <div 
            className="prose prose-sm max-w-none mb-6" 
            dangerouslySetInnerHTML={{ __html: thread.content }} 
          />

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