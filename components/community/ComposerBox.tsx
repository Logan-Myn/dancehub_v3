"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ComposerBoxProps {
  userAvatar: string;
  userName: string;
  onClick: () => void;
  disabled?: boolean;
}

const placeholderTexts = [
  "Share your latest performance...",
  "Ask about a technique...",
  "Discuss upcoming events...",
  "Share a song recommendation...",
  "Post a practice video...",
];

export default function ComposerBox({
  userAvatar,
  userName,
  onClick,
  disabled = false,
}: ComposerBoxProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholderTexts.length);
        setIsAnimating(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={cn(
        "bg-card rounded-2xl p-4 shadow-sm border border-border/50",
        "transition-all duration-300 ease-out",
        "hover:shadow-md hover:border-primary/30",
        "focus-within:shadow-lg focus-within:border-primary/50 focus-within:animate-glow-pulse",
        !disabled && "cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {userName?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 relative overflow-hidden">
          <div
            className={cn(
              "text-muted-foreground text-sm md:text-base",
              "transition-all duration-300",
              isAnimating && "opacity-0 transform -translate-y-2",
              !isAnimating && "opacity-100 transform translate-y-0"
            )}
          >
            <span className="text-muted-foreground/70">Start a conversation... </span>
            <span className="text-primary/70 font-medium">
              {placeholderTexts[currentPlaceholder]}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-muted-foreground/50">
          <kbd className="px-2 py-1 text-xs bg-muted rounded-md">Click to post</kbd>
        </div>
      </div>
    </div>
  );
}
