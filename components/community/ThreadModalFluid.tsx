"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Pin,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDisplayName, cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Editor from "@/components/Editor";
import CommentFluid from "./CommentFluid";

interface ThreadModalFluidProps {
  isOpen: boolean;
  onClose: () => void;
  thread: {
    id: string;
    user_id: string;
    title: string;
    content: string;
    author: {
      name: string;
      image: string;
    };
    created_at: string;
    likes_count: number;
    comments_count: number;
    category?: string;
    category_type?: string;
    likes?: string[];
    comments?: Comment[];
    pinned?: boolean;
  };
  onLikeUpdate: (threadId: string, newLikesCount: number, liked: boolean) => void;
  onCommentUpdate?: (threadId: string, newComment: any) => void;
  onThreadUpdate?: (
    threadId: string,
    updates: {
      title?: string;
      content?: string;
      comments?: any[];
      comments_count?: number;
      pinned?: boolean;
    }
  ) => void;
  onDelete?: (threadId: string) => void;
  isCreator?: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: {
    name: string;
    image: string;
  };
  created_at: string;
  replies?: Comment[];
  parent_id?: string;
  likes?: string[];
  likes_count?: number;
}

export default function ThreadModalFluid({
  isOpen,
  onClose,
  thread,
  onLikeUpdate,
  onCommentUpdate,
  onThreadUpdate,
  onDelete,
  isCreator = false,
}: ThreadModalFluidProps) {
  const { user, session } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(thread.likes_count);
  const [localLikes, setLocalLikes] = useState(thread.likes || []);
  const isLiked = user ? localLikes.includes(user.id) : false;
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(thread.title);
  const [editedContent, setEditedContent] = useState(thread.content);
  const isOwner = user?.id === thread.user_id;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [localComments, setLocalComments] = useState(thread.comments || []);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile when modal opens
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) return;
      try {
        const response = await fetch(`/api/profile?userId=${user.id}`);
        if (response.ok) {
          const profile = await response.json();
          if (profile) setUserProfile(profile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }
    if (isOpen) fetchUserProfile();
  }, [isOpen, user]);

  useEffect(() => {
    setLocalComments(thread.comments || []);
  }, [thread.comments]);

  useEffect(() => {
    setLocalLikesCount(thread.likes_count);
    setLocalLikes(thread.likes || []);
  }, [thread.likes_count, thread.likes]);

  const iconConfig = CATEGORY_ICONS.find((i) => i.label === thread.category_type);
  const IconComponent = iconConfig?.icon || null;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !session) {
      toast.error("Please sign in to like threads");
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/threads/${thread.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error("Failed to like thread");

      const data = await response.json();
      onLikeUpdate(thread.id, data.likesCount, data.liked);
      setLocalLikesCount(data.likesCount);
      setLocalLikes(
        data.liked
          ? [...localLikes, user.id]
          : localLikes.filter((id) => id !== user.id)
      );
    } catch (error) {
      console.error("Error liking thread:", error);
      toast.error("Failed to like thread");
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) {
      toast.error("Please sign in to comment");
      return;
    }
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const displayName =
        userProfile?.display_name || userProfile?.full_name || user.name || "Anonymous";
      const avatarUrl = userProfile?.avatar_url || user.image;

      const response = await fetch(`/api/threads/${thread.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: comment.trim(),
          userId: user.id,
          author: { id: user.id, name: displayName, avatar_url: avatarUrl },
        }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      const newComment = await response.json();
      onCommentUpdate?.(thread.id, newComment);
      setComment("");
      toast.success("Comment posted!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast.error("Title and content cannot be empty");
      return;
    }
    if (!session) {
      toast.error("Please sign in to edit");
      return;
    }

    try {
      const response = await fetch(`/api/threads/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle.trim(),
          content: editedContent.trim(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update thread");

      onThreadUpdate?.(thread.id, {
        title: editedTitle.trim(),
        content: editedContent.trim(),
      });
      thread.title = editedTitle.trim();
      thread.content = editedContent.trim();
      setIsEditing(false);
      toast.success("Thread updated!");
    } catch (error) {
      console.error("Error updating thread:", error);
      toast.error("Failed to update thread");
    }
  };

  const handleDelete = async () => {
    if (!session) {
      toast.error("Please sign in to delete");
      return;
    }

    try {
      const response = await fetch(`/api/threads/${thread.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete thread");

      onDelete?.(thread.id);
      onClose();
      toast.success("Thread deleted!");
    } catch (error) {
      console.error("Error deleting thread:", error);
      toast.error("Failed to delete thread");
    }
  };

  const handleTogglePin = async () => {
    if (!session) {
      toast.error("Please sign in to pin/unpin");
      return;
    }

    try {
      const response = await fetch(`/api/threads/${thread.id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to toggle pin");

      const { pinned } = await response.json();
      onThreadUpdate?.(thread.id, { pinned });
      toast.success(pinned ? "Thread pinned!" : "Thread unpinned!");
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to toggle pin");
    }
  };

  const handleReply = async (commentId: string, content: string) => {
    if (!user || !session) {
      toast.error("Please sign in to reply");
      return;
    }

    try {
      const displayName =
        userProfile?.display_name || userProfile?.full_name || user.name || "Anonymous";
      const avatarUrl = userProfile?.avatar_url || user.image;

      const response = await fetch(
        `/api/threads/${thread.id}/comments/${commentId}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            userId: user.id,
            author: { id: user.id, name: displayName, avatar_url: avatarUrl },
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to post reply");

      const newReply = await response.json();
      const updatedComments = localComments.map((c) => {
        if (c.id === commentId) {
          return { ...c, replies: [...(c.replies || []), newReply] };
        }
        return c;
      });
      updatedComments.push({ ...newReply, likes: [], likes_count: 0, replies: [] });

      setLocalComments(updatedComments);
      onThreadUpdate?.(thread.id, {
        comments: updatedComments,
        comments_count: (thread.comments_count || 0) + 1,
      });

      return newReply;
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
      throw error;
    }
  };

  const handleCommentLike = (commentId: string, newLikesCount: number, liked: boolean) => {
    const updateCommentLikes = (comments: Comment[]): Comment[] => {
      return comments.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            likes_count: newLikesCount,
            likes: liked && user?.id
              ? [...(c.likes || []), user.id]
              : (c.likes || []).filter((id) => id !== user?.id),
          };
        }
        if (c.replies?.length) {
          return { ...c, replies: updateCommentLikes(c.replies) };
        }
        return c;
      });
    };

    const updatedComments = updateCommentLikes(localComments);
    setLocalComments(updatedComments);
    onThreadUpdate?.(thread.id, { comments: updatedComments });
  };

  const organizeComments = (comments: Comment[] = []) => {
    const commentMap = new Map();
    const topLevelComments: Comment[] = [];

    for (const comment of comments) {
      commentMap.set(comment.id, { ...comment, replies: [] });
    }

    for (const comment of comments) {
      const commentWithReplies = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) parent.replies.push(commentWithReplies);
      } else {
        topLevelComments.push(commentWithReplies);
      }
    }

    return topLevelComments;
  };

  const organizedComments = organizeComments(localComments);

  const userDisplayName =
    userProfile?.display_name ||
    userProfile?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Anonymous";
  const userAvatarUrl = userProfile?.avatar_url || user?.image;
  const userInitial = userDisplayName[0]?.toUpperCase() || "A";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[750px] p-0 max-h-[90vh] flex flex-col bg-card border-border/50 rounded-2xl overflow-hidden">
          {/* Thread Content */}
          <div className="p-6 pb-4 border-b border-border/50">
            {/* Pinned badge */}
            {thread.pinned && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-3">
                <Pin className="h-3 w-3" />
                <span>Pinned</span>
              </div>
            )}

            {/* Author row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-border/50">
                  <AvatarImage src={thread.author.image} alt={thread.author.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {thread.author.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {thread.author.name}
                    </span>
                    <span className="text-muted-foreground text-sm">·</span>
                    <span className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(thread.created_at))} ago
                    </span>
                  </div>
                  {IconComponent && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <IconComponent
                        className="h-3.5 w-3.5"
                        style={{ color: iconConfig?.color }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: iconConfig?.color }}
                      >
                        {thread.category || "General"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions menu */}
              {(isCreator || isOwner) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {isCreator && (
                      <DropdownMenuItem onClick={handleTogglePin}>
                        <Pin className="h-4 w-4 mr-2" />
                        {thread.pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
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
                  className="font-display text-xl font-semibold border-border/50"
                  placeholder="Thread title"
                />
                <Editor
                  content={editedContent}
                  onChange={(html) => setEditedContent(html)}
                  editable={true}
                  showHeadings={false}
                  showParagraphStyle={false}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedTitle(thread.title);
                      setEditedContent(thread.content);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={!editedTitle.trim() || !editedContent.trim()}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-semibold text-foreground mb-4">
                  {editedTitle}
                </h1>
                <div className="prose prose-sm max-w-none text-foreground">
                  <Editor content={editedContent} onChange={() => {}} editable={false} />
                </div>
              </>
            )}

            {/* Interaction buttons */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/50">
              <button
                onClick={handleLike}
                disabled={isLiking || !user}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  "transition-all duration-200 rounded-full px-3 py-1.5",
                  "hover:bg-primary/10",
                  isLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"
                )}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isLiked && "fill-current",
                    isLiking && "animate-pulse scale-125"
                  )}
                />
                <span>{localLikesCount}</span>
              </button>
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{thread.comments_count} comments</span>
              </div>
            </div>
          </div>

          {/* Comment input */}
          <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 ring-2 ring-border/50 flex-shrink-0 mt-1">
                <AvatarImage src={userAvatarUrl} alt={userDisplayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full min-h-[44px] resize-none py-3 px-4 pr-14 bg-card border-border/50 rounded-xl text-sm"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && comment.trim()) {
                      e.preventDefault();
                      handleSubmitComment(e);
                    }
                  }}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !comment.trim()}
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Comments section */}
          <div className="flex-1 overflow-y-auto p-6">
            {organizedComments.length > 0 ? (
              <div className="space-y-6">
                {organizedComments.map((c) => (
                  <CommentFluid
                    key={c.id}
                    id={c.id}
                    content={c.content}
                    author={c.author}
                    created_at={c.created_at}
                    threadId={thread.id}
                    parent_id={c.parent_id}
                    likes={c.likes}
                    likes_count={c.likes_count}
                    replies={c.replies}
                    onLike={handleCommentLike}
                    onReply={handleReply}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete thread?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your thread and
              all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
