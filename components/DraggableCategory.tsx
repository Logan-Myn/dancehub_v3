import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ThreadCategory } from "@/types/community";
import { CATEGORY_ICONS } from "@/lib/constants";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import { Lock, Users, X, MessageCircle, ChevronDown } from "lucide-react";

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
      className="p-4 space-y-3 hover:bg-muted/30 transition-colors duration-150"
    >
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-muted p-2 rounded-lg transition-colors"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Icon selector dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center gap-1 h-10 px-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50">
              <IconComponent
                className="h-5 w-5"
                style={{ color: selectedIcon?.color }}
              />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl p-2 grid grid-cols-4 gap-1 w-auto">
            {CATEGORY_ICONS.map((icon) => (
              <DropdownMenuItem
                key={icon.label}
                onClick={() => onChange(category.id, 'iconType', icon.label)}
                className={`flex items-center justify-center h-10 w-10 rounded-lg cursor-pointer transition-all ${
                  category.iconType === icon.label
                    ? 'bg-primary/10 ring-2 ring-primary/30'
                    : 'hover:bg-muted'
                }`}
              >
                <icon.icon className="h-5 w-5" style={{ color: icon.color }} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category name input */}
        <Input
          placeholder="Category name"
          value={category.name}
          onChange={(e) => onChange(category.id, 'name', e.target.value)}
          className="flex-1 h-10 px-4 rounded-xl border-border/50 focus:border-primary/50 focus:ring-primary/20"
        />

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(category.id)}
          className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Permission row */}
      <div className="flex items-center justify-between ml-[52px] mr-1 px-4 py-3 bg-muted/30 rounded-xl">
        <div className="flex items-center gap-2">
          {category.creatorOnly ? (
            <Lock className="h-4 w-4 text-amber-500" />
          ) : (
            <Users className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm text-muted-foreground">
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
