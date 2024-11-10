import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

interface CommentProps {
  id: string;
  threadId: string;
  author: {
    name: string;
    image: string;
  };
  content: string;
  createdAt: string;
  parentId?: string;
  replies?: CommentProps[];
  onReply: (commentId: string, content: string) => Promise<void>;
}

export default function Comment({ 
  id, 
  threadId, 
  author, 
  content, 
  createdAt, 
  parentId,
  replies = [], 
  onReply 
}: CommentProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formattedAuthorName = formatDisplayName(author.name);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onReply(id, replyContent);
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only render replies for top-level comments
  const isTopLevel = !parentId;

  return (
    <div className={`space-y-4 ${isTopLevel ? '' : 'ml-8 mt-4 border-l-2 border-gray-100 pl-4'}`}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.image} alt={formattedAuthorName} />
          <AvatarFallback>{formattedAuthorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{formattedAuthorName}</span>
            <span className="text-gray-500 text-xs">·</span>
            <span className="text-gray-500 text-xs">
              {formatDistanceToNow(new Date(createdAt))} ago
            </span>
          </div>
          <p className="text-sm mt-1">{content}</p>
          {user && !parentId && ( // Only show reply button for top-level comments
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-sm text-gray-500 hover:text-gray-700 mt-2"
            >
              Reply
            </button>
          )}
        </div>
      </div>

      {isReplying && (
        <div className="ml-11 mt-2">
          <form onSubmit={handleSubmitReply} className="space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[80px]"
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsReplying(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !replyContent.trim()}
                size="sm"
              >
                {isSubmitting ? 'Posting...' : 'Reply'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Show replies */}
      {isTopLevel && replies.map((reply) => (
        <Comment
          key={reply.id}
          {...reply}
          threadId={threadId}
          parentId={id}
          onReply={onReply}
        />
      ))}
    </div>
  );
} 