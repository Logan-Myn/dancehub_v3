import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";

interface CommentProps {
  author: {
    name: string;
    image: string;
  };
  content: string;
  createdAt: string;
}

export default function Comment({ author, content, createdAt }: CommentProps) {
  const formattedAuthorName = formatDisplayName(author.name);

  return (
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
      </div>
    </div>
  );
} 