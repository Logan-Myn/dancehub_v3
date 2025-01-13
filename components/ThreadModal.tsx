"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare, MoreVertical, Edit2, Trash } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Editor from "./Editor";
import { createClient } from "@/lib/supabase";

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
  };
  onLikeUpdate: (threadId: string, newLikesCount: number, liked: boolean) => void;
  onCommentUpdate?: (threadId: string, newComment: any) => void;
  onThreadUpdate?: (threadId: string, updates: { 
    title?: string; 
    content?: string; 
    comments?: any[];
    comments_count?: number;
  }) => void;
  onDelete?: (threadId: string) => void;
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
  replies?: CommentProps[];
}

export default function ThreadModal({ isOpen, onClose, thread, onLikeUpdate, onCommentUpdate, onThreadUpdate, onDelete }: ThreadModalProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const isLiked = user ? thread.likes?.includes(user.id) : false;
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(thread.title);
  const [editedContent, setEditedContent] = useState(thread.content);
  const isOwner = user?.id === thread.user_id;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const supabase = createClient();

  const formattedAuthorName = formatDisplayName(thread.author.name);
  const iconConfig = CATEGORY_ICONS.find(i => i.label === thread.category_type);
  const IconComponent = iconConfig?.icon || MessageSquare;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to like threads');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/threads/${thread.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to like thread');
      }

      const data = await response.json();
      onLikeUpdate(thread.id, data.likes_count, data.liked);
    } catch (error) {
      console.error('Error liking thread:', error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to like threads');
      } else {
        toast.error('Failed to like thread. Please try again.');
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!comment.trim()) return;

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/threads/${thread.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: comment.trim(),
          userId: user.id,
          author: {
            id: user.id,
            name: user.user_metadata?.full_name || 'Anonymous',
            avatar_url: user.user_metadata?.avatar_url,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to post comment');
      }

      const newComment = await response.json();
      onCommentUpdate?.(thread.id, newComment);
      setComment('');
      toast.success('Comment posted successfully');
    } catch (error) {
      console.error('Error posting comment:', error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to comment');
      } else {
        toast.error('Failed to post comment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast.error('Title and content cannot be empty');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/threads/${thread.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: editedTitle.trim(),
          content: editedContent.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update thread');
      }

      onThreadUpdate?.(thread.id, {
        title: editedTitle.trim(),
        content: editedContent.trim(),
      });

      thread.title = editedTitle.trim();
      thread.content = editedContent.trim();

      setIsEditing(false);
      toast.success('Thread updated successfully');
    } catch (error) {
      console.error('Error updating thread:', error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to edit the thread');
      } else {
        toast.error('Failed to update thread. Please try again.');
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(thread.title);
    setEditedContent(thread.content);
  };

  const handleDelete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/threads/${thread.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete thread');
      }

      onDelete?.(thread.id);
      onClose();
      toast.success('Thread deleted successfully');
    } catch (error) {
      console.error('Error deleting thread:', error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to delete the thread');
      } else {
        toast.error('Failed to delete thread. Please try again.');
      }
    }
  };

  const handleReply = async (commentId: string, content: string) => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/threads/${thread.id}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          userId: user.id,
          author: {
            id: user.id,
            name: user.user_metadata?.full_name || 'Anonymous',
            avatar_url: user.user_metadata?.avatar_url,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to post reply');
      }

      const newReply = await response.json();
      const updatedComments = [...(thread.comments || []), newReply];
      onThreadUpdate?.(thread.id, {
        comments: updatedComments,
        comments_count: (thread.comments_count || 0) + 1,
      });

      return newReply;
    } catch (error) {
      console.error('Error posting reply:', error);
      if (error instanceof Error && error.message.includes('session')) {
        toast.error('Please sign in again to reply');
      } else {
        toast.error('Failed to post reply. Please try again.');
      }
      throw error;
    }
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

  const organizedComments = organizeComments(thread.comments);

  // Add this helper function before the return statement
  const mapCommentToProps = (comment: Comment): CommentProps => ({
    ...comment,
    threadId: thread.id,
    onReply: handleReply,
    replies: comment.replies?.map((reply: Comment) => mapCommentToProps(reply))
  });

  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous';
  const userAvatarUrl = user?.user_metadata?.avatar_url;
  const userInitial = userDisplayName[0]?.toUpperCase() || 'A';

  return (
    <>
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
                      {formatDistanceToNow(new Date(thread.created_at))} ago
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
              {isOwner && (
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
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
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
                  isLiked ? 'text-blue-500' : ''
                }`}
                disabled={isLiking || !user}
              >
                <ThumbsUp className={`h-5 w-5 ${isLiking ? 'animate-pulse' : ''}`} />
                <span>{thread.likes_count}</span>
              </button>
              <button className="flex items-center space-x-1 hover:text-gray-700">
                <MessageSquare className="h-5 w-5" />
                <span>{thread.comments_count}</span>
              </button>
            </div>

            {/* Comments section */}
            <div className="mt-6 border-t pt-6">
              <h3 className="font-medium mb-4">Comments</h3>

              {/* Comment input */}
              <div className="flex items-start space-x-3 mb-6">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userAvatarUrl || ''} alt={userDisplayName} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
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
                      disabled={isSubmitting || !comment.trim() || !user}
                      size="sm"
                    >
                      {isSubmitting ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {organizedComments.map((comment) => (
                  <Comment
                    key={comment.id}
                    {...mapCommentToProps(comment)}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your thread and all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 