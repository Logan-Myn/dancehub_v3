"use client";

import { useState, useEffect } from "react";
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
  content: string;
  author: {
    name: string;
    image: string;
  };
  created_at: string;
  threadId: string;
  parent_id?: string;
  likes?: string[];
  likes_count?: number;
  replies?: CommentProps[];
  onLike?: (commentId: string, newLikesCount: number, liked: boolean) => void;
  onReply?: (commentId: string, content: string) => Promise<any>;
}

export default function Comment({
  id,
  content,
  author,
  created_at,
  threadId,
  parent_id,
  likes = [],
  likes_count = 0,
  replies = [],
  onLike,
  onReply
}: CommentProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [isLiking, setIsLiking] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [localLikes, setLocalLikes] = useState(likes);
  const [localLikesCount, setLocalLikesCount] = useState(likes_count);
  const isLiked = user?.id ? localLikes.includes(user.id) : false;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    const newLikes = isLiked 
      ? localLikes.filter(id => id !== user.id)
      : [...localLikes, user.id];
    const newLikesCount = isLiked ? localLikesCount - 1 : localLikesCount + 1;
    setLocalLikes(newLikes);
    setLocalLikesCount(newLikesCount);

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
        setLocalLikes(likes);
        setLocalLikesCount(likes_count);
        const error = await response.text();
        throw new Error(error || 'Failed to like comment');
      }

      const data = await response.json();
      onLike?.(id, data.likes_count, data.liked);
    } catch (error) {
      console.error('Error liking comment:', error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to like comments');
      } else {
        toast.error('Failed to like comment. Please try again.');
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;

    try {
      setIsSubmittingReply(true);
      const newReply = await onReply?.(id, replyContent);
      if (newReply) {
        setReplyContent('');
        setIsReplying(false);
        setShowReplies(true);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  useEffect(() => {
    setLocalLikes(likes);
    setLocalLikesCount(likes_count);
  }, [likes, likes_count]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.image} alt={formatDisplayName(author.name)} />
          <AvatarFallback>{formatDisplayName(author.name)[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{formatDisplayName(author.name)}</span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-gray-700">{content}</p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 hover:text-blue-500 transition-colors ${
                isLiked ? 'text-blue-500' : ''
              }`}
              disabled={isLiking || !user}
            >
              <ThumbsUp className={`h-4 w-4 ${isLiking ? 'animate-pulse' : ''}`} />
              <span>{localLikesCount}</span>
            </button>
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-sm text-gray-500 hover:text-blue-500"
            >
              Reply
            </button>
          </div>
          {isReplying && (
            <div className="mt-4 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsReplying(false)}
                  className="rounded-md px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={isSubmittingReply || !replyContent.trim()}
                  className="rounded-md bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSubmittingReply ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-12">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="mb-2 text-sm text-gray-500 hover:text-blue-500"
          >
            {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div className="space-y-4">
              {replies.map((reply) => (
                <Comment
                  key={reply.id}
                  {...reply}
                  threadId={threadId}
                  onLike={onLike}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 