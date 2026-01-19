"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDisplayName, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentFluidProps {
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
  replies?: CommentFluidProps[];
  onLike?: (commentId: string, newLikesCount: number, liked: boolean) => void;
  onReply?: (commentId: string, content: string) => Promise<any>;
}

export default function CommentFluid({
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
  onReply,
}: CommentFluidProps) {
  const { user, session } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [localLikes, setLocalLikes] = useState(likes);
  const [localLikesCount, setLocalLikesCount] = useState(likes_count);
  const isLiked = user?.id ? localLikes.includes(user.id) : false;

  useEffect(() => {
    setLocalLikes(likes);
    setLocalLikesCount(likes_count);
  }, [likes, likes_count]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    const newLikes = isLiked
      ? localLikes.filter((likeId) => likeId !== user.id)
      : [...localLikes, user.id];
    const newLikesCount = isLiked ? localLikesCount - 1 : localLikesCount + 1;
    setLocalLikes(newLikes);
    setLocalLikesCount(newLikesCount);

    try {
      if (!session) throw new Error("No active session");

      const response = await fetch(
        `/api/threads/${threadId}/comments/${id}/like`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) {
        setLocalLikes(likes);
        setLocalLikesCount(likes_count);
        throw new Error("Failed to like comment");
      }

      const data = await response.json();
      onLike?.(id, data.likes_count, data.liked);
    } catch (error) {
      console.error("Error liking comment:", error);
      toast.error("Failed to like comment");
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
        setReplyContent("");
        setIsReplying(false);
        setShowReplies(true);
      }
    } catch (error) {
      console.error("Error submitting reply:", error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="group flex items-start gap-3">
        <Avatar className="h-8 w-8 ring-2 ring-border/30 flex-shrink-0">
          <AvatarImage src={author.image} alt={formatDisplayName(author.name)} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {formatDisplayName(author.name)[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Comment bubble */}
          <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground">
                {formatDisplayName(author.name)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
              {content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1.5 ml-2">
            <button
              onClick={handleLike}
              disabled={isLiking || !user}
              className={cn(
                "flex items-center gap-1 text-xs font-medium transition-colors",
                isLiked
                  ? "text-pink-500"
                  : "text-muted-foreground hover:text-pink-500"
              )}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5",
                  isLiked && "fill-current",
                  isLiking && "animate-pulse"
                )}
              />
              {localLikesCount > 0 && <span>{localLikesCount}</span>}
            </button>

            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Reply
            </button>
          </div>

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3 flex items-start gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[36px] text-sm resize-none py-2 bg-card border-border/50 rounded-xl"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && replyContent.trim()) {
                    e.preventDefault();
                    handleSubmitReply();
                  }
                }}
              />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent("");
                  }}
                  className="h-8 px-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={isSubmittingReply || !replyContent.trim()}
                  className="h-8 px-3"
                >
                  {isSubmittingReply ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-2"
          >
            {showReplies ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showReplies ? "Hide" : "Show"} {replies.length}{" "}
            {replies.length === 1 ? "reply" : "replies"}
          </button>

          {showReplies && (
            <div className="space-y-3 border-l-2 border-border/30 pl-4">
              {replies.map((reply) => (
                <CommentFluid
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
