"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { createClient } from "@/lib/supabase";

interface CommentProps {
  id: string;
  threadId: string;
  content: string;
  author: {
    name: string;
    image: string;
  };
  created_at: string;
  replies?: CommentProps[];
  parent_id?: string;
  likes?: string[];
  likes_count?: number;
  onReply: (commentId: string, content: string) => Promise<void>;
  depth?: number;
}

export default function Comment({ 
  id, 
  threadId, 
  content, 
  author, 
  created_at, 
  replies = [], 
  onReply,
  depth = 0,
  likes = [],
  likes_count = 0,
}: CommentProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLiked = user ? likes.includes(user.id) : false;
  const supabase = createClient();

  const formattedAuthorName = formatDisplayName(author.name);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/threads/${threadId}/comments/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to like comment');
      }

      const data = await response.json();
      // The parent component will handle updating the UI
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      await onReply(id, replyContent);
      setReplyContent("");
      setIsReplying(false);
      toast.success('Reply posted successfully');
    } catch (error) {
      console.error('Error posting reply:', error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to post a reply');
      } else {
        toast.error('Failed to post reply. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`pl-${depth * 8}`}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.image} alt={formattedAuthorName} />
          <AvatarFallback>{formattedAuthorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg px-4 py-2.5">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{formattedAuthorName}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">
                {formatDistanceToNow(new Date(created_at))} ago
              </span>
            </div>
            <p className="mt-1">{content}</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-4 mt-1 text-sm">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors ${
                isLiked ? 'text-blue-500' : ''
              }`}
              disabled={isLiking || !user}
            >
              <ThumbsUp className={`h-4 w-4 ${isLiking ? 'animate-pulse' : ''}`} />
              <span>{likes_count}</span>
            </button>
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              disabled={!user}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Reply</span>
            </button>
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="mt-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[80px] mb-2"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent("");
                  }}
                  disabled={isSubmitting}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                  size="sm"
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {replies && replies.length > 0 && (
            <div className="mt-4">
              {replies.map((reply) => (
                <Comment
                  key={reply.id}
                  {...reply}
                  depth={depth + 1}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 