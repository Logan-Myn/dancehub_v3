import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { CATEGORY_ICONS } from "@/lib/constants";
import { formatDisplayName } from "@/lib/utils";

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
}: ThreadCardProps) {
  const iconConfig = CATEGORY_ICONS.find(i => i.label === categoryType);
  const IconComponent = iconConfig?.icon || MessageCircle;
  const formattedAuthorName = formatDisplayName(author.name);

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
        <button className="flex items-center space-x-1 hover:text-gray-700">
          <ThumbsUp className="h-5 w-5" />
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