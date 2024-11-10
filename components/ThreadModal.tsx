"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThumbsUp, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { formatDisplayName } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";

interface ThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: {
    id: string;
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
    categoryType?: string;
  };
}

export default function ThreadModal({ isOpen, onClose, thread }: ThreadModalProps) {
  const formattedAuthorName = formatDisplayName(thread.author.name);
  
  // Get the icon configuration for the category
  const iconConfig = CATEGORY_ICONS.find(i => i.label === thread.categoryType);
  const IconComponent = iconConfig?.icon || MessageSquare;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <div className="p-6">
          {/* Author info and metadata */}
          <div className="flex items-center space-x-2 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={thread.author.image} alt={formattedAuthorName} />
              <AvatarFallback>{formattedAuthorName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{formattedAuthorName}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500">
                  {formatDistanceToNow(new Date(thread.createdAt))} ago
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

          {/* Thread content */}
          <h2 className="text-2xl font-semibold mb-4">{thread.title}</h2>
          <div 
            className="prose prose-sm max-w-none mb-6" 
            dangerouslySetInnerHTML={{ __html: thread.content }} 
          />

          {/* Interaction buttons */}
          <div className="flex items-center space-x-4 text-gray-500 border-t pt-4">
            <button className="flex items-center space-x-1 hover:text-gray-700">
              <ThumbsUp className="h-5 w-5" />
              <span>{thread.likesCount}</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-gray-700">
              <MessageSquare className="h-5 w-5" />
              <span>{thread.commentsCount}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 