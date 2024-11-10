import { ThreadCategory } from "@/types/community";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/lib/constants";
import { MessageCircle } from 'lucide-react';

interface ThreadCategoriesProps {
  categories: ThreadCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function ThreadCategories({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: ThreadCategoriesProps) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-6">
      {/* All category button */}
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          "flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors",
          !selectedCategory 
            ? "bg-gray-900 text-white" 
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        All
      </button>

      {/* Category buttons */}
      {categories.map((category) => {
        const iconConfig = CATEGORY_ICONS.find(i => i.label === category.iconType);
        const IconComponent = iconConfig?.icon || MessageCircle;
        const iconColor = iconConfig?.color || '#6B7280';
        
        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              selectedCategory === category.id
                ? "bg-gray-900 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <IconComponent 
              className="h-4 w-4" 
              style={{ 
                color: selectedCategory === category.id ? 'white' : iconColor
              }} 
            />
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
} 