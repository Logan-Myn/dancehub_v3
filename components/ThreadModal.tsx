"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  ThumbsUp,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash,
  MessageCircle,
  Pin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import Editor from "./Editor";

interface ThreadModalProps {
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
    comments?: {
      id: string;
      content: string;
      author: {
        name: string;
        image: string;
      };
      created_at: string;
      replies?: any[];
      parent_id?: string;
      likes?: string[];
      likes_count?: number;
    }[];
    pinned?: boolean;
  };
  onLikeUpdate: (
    threadId: string,
    newLikesCount: number,
    liked: boolean
  ) => void;
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

interface CommentProps extends Comment {
  threadId: string;
  onReply: (commentId: string, content: string) => Promise<void>;
  onLikeUpdate: (
    commentId: string,
    newLikesCount: number,
    liked: boolean
  ) => void;
  replies?: CommentProps[];
}

export default function ThreadModal({
  isOpen,
  onClose,
  thread,
  onLikeUpdate,
  onCommentUpdate,
  onThreadUpdate,
  onDelete,
  isCreator = false,
}: ThreadModalProps) {
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
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }

    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

  // Update local state when thread comments change
  useEffect(() => {
    setLocalComments(thread.comments || []);
  }, [thread.comments]);

  // Update local state when thread changes
  useEffect(() => {
    setLocalLikesCount(thread.likes_count);
    setLocalLikes(thread.likes || []);
  }, [thread.likes_count, thread.likes]);

  const iconConfig = CATEGORY_ICONS.find(
    (i) => i.label === thread.category_type
  );
  const IconComponent = iconConfig?.icon || MessageCircle;

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to like thread");
      }

      const data = await response.json();
      // Update the thread's likes count in the parent component
      onLikeUpdate(thread.id, data.likesCount, data.liked);
      // Update local state
      setLocalLikesCount(data.likesCount);
      setLocalLikes(data.liked
        ? [...localLikes, user.id]
        : localLikes.filter(id => id !== user.id)
      );
    } catch (error) {
      console.error("Error liking thread:", error);
      toast.error("Failed to like thread. Please try again.");
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
      // Use userProfile fetched on modal open, or fallback to user data
      const displayName = userProfile?.display_name || userProfile?.full_name || user.name || "Anonymous";
      const avatarUrl = userProfile?.avatar_url || user.image;

      const response = await fetch(`/api/threads/${thread.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: comment.trim(),
          userId: user.id,
          author: {
            id: user.id,
            name: displayName,
            avatar_url: avatarUrl,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to post comment");
      }

      const newComment = await response.json();
      onCommentUpdate?.(thread.id, newComment);
      setComment("");
      toast.success("Comment posted successfully");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment. Please try again.");
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
      toast.error("Please sign in to edit the thread");
      return;
    }

    try {
      const response = await fetch(`/api/threads/${thread.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedTitle.trim(),
          content: editedContent.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update thread");
      }

      onThreadUpdate?.(thread.id, {
        title: editedTitle.trim(),
        content: editedContent.trim(),
      });

      thread.title = editedTitle.trim();
      thread.content = editedContent.trim();

      setIsEditing(false);
      toast.success("Thread updated successfully");
    } catch (error) {
      console.error("Error updating thread:", error);
      toast.error("Failed to update thread. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(thread.title);
    setEditedContent(thread.content);
  };

  const handleDelete = async () => {
    if (!session) {
      toast.error("Please sign in to delete the thread");
      return;
    }

    try {
      const response = await fetch(`/api/threads/${thread.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to delete thread");
      }

      onDelete?.(thread.id);
      onClose();
      toast.success("Thread deleted successfully");
    } catch (error) {
      console.error("Error deleting thread:", error);
      toast.error("Failed to delete thread. Please try again.");
    }
  };

  const handleReply = async (commentId: string, content: string) => {
    if (!user || !session) {
      toast.error("Please sign in to reply");
      return;
    }

    try {
      // Use userProfile fetched on modal open, or fallback to user data
      const displayName = userProfile?.display_name || userProfile?.full_name || user.name || "Anonymous";
      const avatarUrl = userProfile?.avatar_url || user.image;

      const response = await fetch(
        `/api/threads/${thread.id}/comments/${commentId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content.trim(),
            userId: user.id,
            author: {
              id: user.id,
              name: displayName,
              avatar_url: avatarUrl,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to post reply");
      }

      const newReply = await response.json();

      // Update the comments array with the new reply
      const updatedComments = localComments.map((comment) => {
        if (comment.id === commentId) {
          // Add the reply to the parent comment's replies array
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply],
          };
        }
        return comment;
      });

      // Also add the reply to the flat list of comments
      updatedComments.push({
        ...newReply,
        likes: [],
        likes_count: 0,
        replies: [],
      });

      // Update local state immediately
      setLocalComments(updatedComments);

      // Update parent state
      onThreadUpdate?.(thread.id, {
        comments: updatedComments,
        comments_count: (thread.comments_count || 0) + 1,
      });

      return newReply;
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply. Please try again.");
      throw error;
    }
  };

  const handleCommentLike = (
    commentId: string,
    newLikesCount: number,
    liked: boolean
  ) => {
    const updatedComments = localComments.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes_count: newLikesCount,
          likes:
            liked && user?.id
              ? [...(comment.likes || []), user.id]
              : (comment.likes || []).filter(
                  (likeId: string) => likeId !== user?.id
                ),
        };
      }
      // Also check nested replies
      if (comment.replies?.length) {
        return {
          ...comment,
          replies: comment.replies.map((reply) => {
            if (reply.id === commentId) {
              return {
                ...reply,
                likes_count: newLikesCount,
                likes:
                  liked && user?.id
                    ? [...(reply.likes || []), user.id]
                    : (reply.likes || []).filter(
                        (likeId: string) => likeId !== user?.id
                      ),
              };
            }
            return reply;
          }),
        };
      }
      return comment;
    });

    // Update local state immediately
    setLocalComments(updatedComments);

    // Update parent state
    onThreadUpdate?.(thread.id, {
      comments: updatedComments,
    });
  };

  // Organize comments into a hierarchical structure
  const organizeComments = (comments: Comment[] = []) => {
    const commentMap = new Map();
    const topLevelComments: Comment[] = [];

    // First pass: Create a map of all comments
    for (const comment of comments) {
      commentMap.set(comment.id, { ...comment, replies: [] });
    }

    // Second pass: Organize into hierarchy
    for (const comment of comments) {
      const commentWithReplies = commentMap.get(comment.id);
      if (comment.parent_id) {
        // This is a reply - add it to its parent's replies
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentWithReplies);
      }
    }

    return topLevelComments;
  };

  const organizedComments = organizeComments(localComments);

  // Add this helper function before the return statement
  const mapCommentToProps = (comment: Comment): CommentProps => ({
    ...comment,
    threadId: thread.id,
    onReply: handleReply,
    onLikeUpdate: handleCommentLike,
    replies: comment.replies?.map((reply: Comment) => mapCommentToProps(reply)),
  });

  const userDisplayName =
    userProfile?.display_name ||
    userProfile?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Anonymous";
  const userAvatarUrl = userProfile?.avatar_url || user?.image;
  const userInitial = userDisplayName[0]?.toUpperCase() || "A";

  const handleTogglePin = async () => {
    if (!session) {
      toast.error("Please sign in to pin/unpin threads");
      return;
    }

    try {
      const response = await fetch(`/api/threads/${thread.id}/pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to toggle pin status");
      }

      const { pinned } = await response.json();
      onThreadUpdate?.(thread.id, { pinned });
      toast.success(
        pinned ? "Thread pinned successfully" : "Thread unpinned successfully"
      );
    } catch (error) {
      console.error("Error toggling pin status:", error);
      toast.error("Failed to toggle pin status. Please try again.");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] p-0 max-h-[90vh] flex flex-col bg-white">
          <div className="p-6 border-b bg-white"> {/* Added bg-white here */}
            {/* Author info and metadata */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={thread.author.image}
                    alt={thread.author.name}
                  />
                  <AvatarFallback>{thread.author.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{thread.author.name}</span>
                    <span className="text-gray-500">posted in</span>
                    <div className="flex items-center space-x-1">
                      {iconConfig && (
                        <IconComponent
                          className="h-4 w-4"
                          style={{ color: iconConfig.color }}
                        />
                      )}
                      <span style={{ color: iconConfig?.color }}>
                        {thread.category || "General"}
                      </span>
                    </div>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500">
                      {formatDistanceToNow(new Date(thread.created_at))} ago
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isCreator && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleTogglePin}>
                        <Pin className="h-4 w-4 mr-2" />
                        {thread.pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {isOwner && !isCreator && (
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
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
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
                <Editor
                  content={editedContent}
                  onChange={(html) => setEditedContent(html)}
                  editable={true}
                  showHeadings={false}
                  showParagraphStyle={false}
                  showAlignment={false}
                  placeholder="Write your post..."
                  minHeight="120px"
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
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
                <h2 className="text-2xl font-semibold mb-4">{editedTitle}</h2>
                <Editor
                  content={editedContent}
                  onChange={() => {}}
                  editable={false}
                />
              </>
            )}

            {/* Interaction buttons */}
            <div className="flex items-center space-x-4 text-gray-500 border-t pt-4">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-1 hover:text-blue-500 transition-colors ${
                  isLiked ? "text-blue-500" : ""
                }`}
                disabled={isLiking || !user}
              >
                <ThumbsUp
                  className={`h-5 w-5 ${isLiking ? "animate-pulse" : ""}`}
                />
                <span>{localLikesCount}</span>
              </button>
              <button className="flex items-center space-x-1 hover:text-gray-700">
                <MessageSquare className="h-5 w-5" />
                <span>{thread.comments_count}</span>
              </button>
            </div>
          </div>

          {/* Comment input - between thread and comments */}
          <div className="px-6 py-3 border-b bg-white">
            <div className="flex items-center w-full gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={userAvatarUrl} alt={userDisplayName} />
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center w-full gap-2">
                <div className="flex-1 w-full">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full min-h-[40px] resize-none py-2"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && comment.trim()) {
                        e.preventDefault();
                        handleSubmitComment(e);
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !comment.trim()}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {isSubmitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>

          {/* Comments section - scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {organizedComments.map((comment) => (
                <Comment key={comment.id} {...mapCommentToProps(comment)} />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              thread and all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
