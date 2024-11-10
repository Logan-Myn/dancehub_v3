import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { CATEGORY_ICONS } from "@/lib/constants";
import { formatDisplayName } from "@/lib/utils";
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface ThreadCardProps {
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
  categoryId?: string;
  categoryType?: string;
  onClick: () => void;
  id: string;
  likes?: string[];
  onLikeUpdate?: (threadId: string, newLikesCount: number, liked: boolean) => void;
}

export default function ThreadCard({
  title,
  content,
  author,
  createdAt,
  likesCount,
  commentsCount,
  category,
  categoryType,
  onClick,
  id,
  likes = [],
  onLikeUpdate,
}: ThreadCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const isLiked = user ? likes.includes(user.uid) : false;

  const iconConfig = CATEGORY_ICONS.find(i => i.label === categoryType);
  const IconComponent = iconConfig?.icon || MessageCircle;
  const formattedAuthorName = formatDisplayName(author.name);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening thread modal when clicking like

    if (!user) {
      toast.error('Please sign in to like threads');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/threads/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) throw new Error('Failed to like thread');

      const data = await response.json();
      onLikeUpdate?.(id, data.likesCount, data.liked);
    } catch (error) {
      console.error('Error liking thread:', error);
      toast.error('Failed to like thread');
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow p-4 mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Author info and metadata */}
      <div className="flex items-center space-x-2 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.image} alt={formattedAuthorName} />
          <AvatarFallback>{formattedAuthorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{formattedAuthorName}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">
              {formatDistanceToNow(new Date(createdAt))} ago
            </span>
            {category && (
              <>
                <span className="text-gray-500">in</span>
                <div className="flex items-center space-x-1">
                  <IconComponent 
                    className="h-4 w-4"
                    style={{ color: iconConfig?.color }}
                  />
                  <span style={{ color: iconConfig?.color }}>{category}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Thread content */}
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div 
        className="prose prose-sm max-w-none mb-4" 
        dangerouslySetInnerHTML={{ __html: content }} 
      />

      {/* Interaction buttons */}
      <div className="flex items-center space-x-4 text-gray-500">
        <button 
          onClick={handleLike}
          className={`flex items-center space-x-1 hover:text-blue-500 transition-colors ${
            isLiked ? 'text-blue-500' : ''
          }`}
          disabled={isLiking}
        >
          <ThumbsUp className={`h-5 w-5 ${isLiking ? 'animate-pulse' : ''}`} />
          <span>{likesCount}</span>
        </button>
        <button className="flex items-center space-x-1 hover:text-gray-700">
          <MessageSquare className="h-5 w-5" />
          <span>{commentsCount}</span>
        </button>
      </div>
    </div>
  );
} 