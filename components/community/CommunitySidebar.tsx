"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronUp, Users } from "lucide-react";
import Link from "next/link";
import { cn, formatDisplayName } from "@/lib/utils";

interface CustomLink {
  title: string;
  url: string;
}

interface Member {
  id: string;
  user_id: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    display_name: string | null;
  };
}

interface CommunitySidebarProps {
  customLinks: CustomLink[];
  members: Member[];
  membersCount: number;
  creatorId: string;
  isMember: boolean;
  isCreator: boolean;
  memberStatus?: string | null;
  accessEndDate?: string | null;
  membershipPrice?: number;
  membershipEnabled?: boolean;
  stripeAccountId?: string | null;
  onLeaveClick: () => void;
  onReactivateClick: () => void;
  onJoinClick: () => void;
}

export default function CommunitySidebar({
  customLinks,
  members,
  membersCount,
  creatorId,
  isMember,
  isCreator,
  memberStatus,
  accessEndDate,
  membershipPrice,
  membershipEnabled,
  stripeAccountId,
  onLeaveClick,
  onReactivateClick,
  onJoinClick,
}: CommunitySidebarProps) {
  const [linksExpanded, setLinksExpanded] = useState(true);

  // Get non-creator members for the dance circle
  const circleMembers = members
    .filter((m) => m.user_id !== creatorId)
    .slice(0, 8);
  const remainingCount = Math.max(0, membersCount - 1 - 8);

  // Calculate positions for dance circle (8 positions around a circle)
  const getCirclePosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 38; // percentage from center
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { x, y };
  };

  return (
    <aside className="sticky top-24 space-y-4">
      {/* Quick Links */}
      {customLinks && customLinks.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <button
            onClick={() => setLinksExpanded(!linksExpanded)}
            className="flex items-center justify-between w-full text-sm font-semibold text-foreground mb-3"
          >
            <span>Quick Links</span>
            {linksExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {linksExpanded && (
            <div className="space-y-2">
              {customLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 text-sm text-muted-foreground",
                    "py-1.5 px-2 -mx-2 rounded-lg",
                    "transition-colors duration-200",
                    "hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{link.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Dance Circle */}
      <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Members ({membersCount - 1})
          </span>
        </div>

        {/* Dance Circle Visualization */}
        <div className="relative w-full aspect-square max-w-[180px] mx-auto mb-4">
          {/* Center decoration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30" />
            </div>
          </div>

          {/* Member avatars in circle */}
          {circleMembers.map((member, index) => {
            const pos = getCirclePosition(index, Math.min(circleMembers.length, 8));
            return (
              <div
                key={member.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <Avatar
                  className={cn(
                    "h-9 w-9 border-2 border-card shadow-md",
                    "transition-all duration-200",
                    "hover:scale-110 hover:z-10 hover:border-primary/50"
                  )}
                >
                  <AvatarImage
                    src={member.profile?.avatar_url || ""}
                    alt={member.profile?.full_name || "Member"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {(
                      member.profile?.display_name?.[0] ||
                      member.profile?.full_name?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Tooltip */}
                <div
                  className={cn(
                    "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
                    "px-2 py-1 bg-foreground text-background text-xs rounded-md",
                    "whitespace-nowrap pointer-events-none",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                    "z-20"
                  )}
                >
                  {member.profile?.display_name ||
                    formatDisplayName(member.profile?.full_name) ||
                    "Anonymous"}
                </div>
              </div>
            );
          })}

          {/* Remaining count badge */}
          {remainingCount > 0 && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "50%", top: "85%" }}
            >
              <div className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-full">
                +{remainingCount} more
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isCreator && (
          <div className="space-y-2">
            {memberStatus === "inactive" ? (
              <>
                <Button
                  onClick={onReactivateClick}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  Join Again
                </Button>
                {accessEndDate && (
                  <p className="text-xs text-center text-amber-600">
                    Access until {new Date(accessEndDate).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : isMember ? (
              <Button
                onClick={onLeaveClick}
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Leave Community
              </Button>
            ) : (
              <Button
                onClick={onJoinClick}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {membershipEnabled && membershipPrice && stripeAccountId
                  ? `Join for €${membershipPrice}/month`
                  : "Join for free"}
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
