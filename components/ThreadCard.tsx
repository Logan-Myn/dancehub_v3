import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CATEGORY_ICONS } from "@/lib/constants";
import { formatDisplayName } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase";

interface ThreadCardProps {
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
  onClick: () => void;
  id: string;
  likes?: string[];
  pinned?: boolean;
  onLikeUpdate?: (
    threadId: string,
    newLikesCount: number,
    liked: boolean
  ) => void;
}

export default function ThreadCard({
  title,
  content,
  author,
  created_at,
  likes_count,
  comments_count,
  category,
  category_type,
  onClick,
  id,
  likes = [],
  pinned = false,
  onLikeUpdate,
}: ThreadCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const isLiked = user ? likes.includes(user.id) : false;
  const supabase = createClient();

  const iconConfig = CATEGORY_ICONS.find((i) => i.label === category_type);
  const IconComponent = iconConfig?.icon || MessageCircle;
  const formattedAuthorName = formatDisplayName(author.name);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening thread modal when clicking like

    if (!user) {
      toast.error("Please sign in to like threads");
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(`/api/threads/${id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to like thread");
      }

      const data = await response.json();
      onLikeUpdate?.(id, data.likesCount, data.liked);
    } catch (error) {
      console.error("Error liking thread:", error);
      if (error instanceof Error && error.message.includes("session")) {
        toast.error("Please sign in again to like threads");
      } else {
        toast.error("Failed to like thread. Please try again.");
      }
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 mb-4 cursor-pointer hover:shadow-md transition-shadow relative ${
        pinned ? 'border-l-4 border-blue-500' : ''
      }`}
      onClick={onClick}
    >
      {pinned && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
          Pinned
        </div>
      )}
      
      {/* Author info and metadata */}
      <div className="flex items-center space-x-2 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.image} alt={formattedAuthorName} />
          <AvatarFallback>{formattedAuthorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{formattedAuthorName}</span>
            <span className="text-gray-500">posted in</span>
            <div className="flex items-center space-x-1">
              {iconConfig && (
                <IconComponent
                  className="h-4 w-4"
                  style={{ color: iconConfig.color }}
                />
              )}
              <span style={{ color: iconConfig?.color }}>
                {category || "General"}
              </span>
            </div>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">
              {formatDistanceToNow(new Date(created_at))} ago
            </span>
          </div>
        </div>
      </div>

      {/* Thread content */}
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div
        className="prose prose-sm max-w-none mt-2"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Interaction buttons */}
      <div className="flex items-center space-x-4 text-gray-500">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-1 hover:text-blue-500 transition-colors ${
            isLiked ? "text-blue-500" : ""
          }`}
          disabled={isLiking || !user}
        >
          <ThumbsUp className={`h-5 w-5 ${isLiking ? "animate-pulse" : ""}`} />
          <span>{likes_count}</span>
        </button>
        <button className="flex items-center space-x-1 hover:text-gray-700">
          <MessageSquare className="h-5 w-5" />
          <span>{comments_count}</span>
        </button>
      </div>
    </div>
  );
}
