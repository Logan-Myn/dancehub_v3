import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ThreadCategory } from "@/types/community";
import { CATEGORY_ICONS } from "@/lib/constants";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Lock, Users, X, MessageCircle } from "lucide-react";

interface DraggableCategoryProps {
  category: ThreadCategory;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof ThreadCategory, value: string | boolean) => void;
}

export function DraggableCategory({ category, onRemove, onChange }: DraggableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const selectedIcon = CATEGORY_ICONS.find(i => i.label === category.iconType);
  const IconComponent = selectedIcon?.icon || MessageCircle;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="space-y-2"
    >
      <div className="flex items-center space-x-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-gray-100 p-2 rounded"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>

        <div className="flex items-center space-x-2 p-2 rounded bg-gray-50">
          <IconComponent 
            className="h-5 w-5"
            style={{ color: selectedIcon?.color }}
          />
        </div>

        <Input
          placeholder="Category name"
          value={category.name}
          onChange={(e) => onChange(category.id, 'name', e.target.value)}
          className="flex-1"
        />

        <Select
          value={category.iconType}
          onValueChange={(value) => onChange(category.id, 'iconType', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select icon" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ICONS.map((icon) => (
              <SelectItem key={icon.label} value={icon.label}>
                <div className="flex items-center space-x-2">
                  <icon.icon className="h-4 w-4" style={{ color: icon.color }} />
                  <span>{icon.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(category.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between pl-12 pr-2 py-2 bg-gray-50 rounded">
        <div className="flex items-center space-x-2">
          {category.creatorOnly ? (
            <Lock className="h-4 w-4 text-amber-600" />
          ) : (
            <Users className="h-4 w-4 text-green-600" />
          )}
          <span className="text-sm text-gray-600">
            {category.creatorOnly ? 'Creator only' : 'All members can post'}
          </span>
        </div>
        <Switch
          checked={!category.creatorOnly}
          onCheckedChange={(checked) => 
            onChange(category.id, 'creatorOnly', !checked)
          }
        />
      </div>
    </div>
  );
} 