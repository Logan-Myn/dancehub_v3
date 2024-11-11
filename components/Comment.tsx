"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { ThumbsUp } from "lucide-react";

interface CommentProps {
  id: string;
  threadId: string;
  content: string;
  author: {
    name: string;
    image: string;
  };
  createdAt: string;
  replies?: CommentProps[];
  onReply: (commentId: string, content: string) => Promise<void>;
  depth?: number;
  likes?: string[];
  likesCount?: number;
  onLikeUpdate?: (commentId: string, newLikesCount: number, liked: boolean) => void;
}

export default function Comment({ 
  id, 
  threadId, 
  content, 
  author, 
  createdAt, 
  replies = [], 
  onReply,
  depth = 0,
  likes = [],
  likesCount = 0,
  onLikeUpdate,
}: CommentProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(likes);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);

  const formattedAuthorName = formatDisplayName(author.name);
  const maxDepth = 5;
  const isLiked = user ? localLikes.includes(user.uid) : false;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);

    const newLikes = isLiked
      ? localLikes.filter(id => id !== user.uid)
      : [...localLikes, user.uid];
    
    setLocalLikes(newLikes);
    setLocalLikesCount(newLikes.length);
    onLikeUpdate?.(id, newLikes.length, !isLiked);

    try {
      const response = await fetch(`/api/threads/${threadId}/comments/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to like comment');
      }

      const data = await response.json();
      
      setLocalLikes(isLiked ? localLikes.filter(id => id !== user.uid) : [...localLikes, user.uid]);
      setLocalLikesCount(data.likesCount);
      onLikeUpdate?.(id, data.likesCount, data.liked);
    } catch (error) {
      setLocalLikes(likes);
      setLocalLikesCount(likesCount);
      onLikeUpdate?.(id, likesCount, isLiked);
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    if (!replyContent.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onReply(id, replyContent);
      setReplyContent('');
      setIsReplying(false);
      toast.success('Reply posted successfully');
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 mt-4' : ''}`}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.image} alt={formattedAuthorName} />
          <AvatarFallback>{formattedAuthorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{formattedAuthorName}</span>
            <span className="text-gray-500">·</span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(createdAt))} ago
            </span>
          </div>
          <p className="mt-1 text-gray-800">{content}</p>
          
          <div className="mt-2 flex items-center space-x-4">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1 text-sm ${
                isLiked ? 'text-blue-500' : 'text-gray-500'
              } hover:text-blue-500 transition-colors`}
              disabled={isLiking}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{localLikesCount}</span>
            </button>

            {!isReplying && depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                Reply
              </Button>
            )}
          </div>

          {isReplying && (
            <form onSubmit={handleSubmitReply} className="mt-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[80px] mb-2"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </form>
          )}

          {replies && replies.length > 0 && (
            <div className="mt-4">
              {replies.map((reply) => (
                <Comment
                  key={reply.id}
                  {...reply}
                  depth={depth + 1}
                  onReply={onReply}
                  onLikeUpdate={onLikeUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 