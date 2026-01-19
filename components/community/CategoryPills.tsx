"use client";

import { useState } from "react";
import { ThreadCategory } from "@/types/community";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";
import { MessageCircle, Sparkles } from "lucide-react";

interface CategoryPillsProps {
  categories: ThreadCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function CategoryPills({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryPillsProps) {
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const handleSelect = (categoryId: string | null) => {
    setAnimatingId(categoryId);
    onSelectCategory(categoryId);
    setTimeout(() => setAnimatingId(null), 300);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
      {/* All category button */}
      <button
        onClick={() => handleSelect(null)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm",
          "transition-all duration-200 ease-out",
          "border-2 whitespace-nowrap",
          !selectedCategory
            ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
            : "bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:bg-primary/5",
          animatingId === null && !selectedCategory && "animate-bounce-subtle"
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span>All</span>
      </button>

      {/* Category buttons */}
      {categories.map((category) => {
        const iconConfig = CATEGORY_ICONS.find(
          (i) => i.label === category.iconType
        );
        const IconComponent = iconConfig?.icon || MessageCircle;
        const iconColor = iconConfig?.color || "hsl(var(--muted-foreground))";
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => handleSelect(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm",
              "transition-all duration-200 ease-out",
              "border-2 whitespace-nowrap",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                : "bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:bg-primary/5",
              animatingId === category.id && isSelected && "animate-bounce-subtle"
            )}
          >
            <IconComponent
              className="h-4 w-4 transition-colors duration-200"
              style={{
                color: isSelected ? "currentColor" : iconColor,
              }}
            />
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
