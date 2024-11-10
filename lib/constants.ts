import { 
  Megaphone, 
  Globe2, 
  Gem, 
  Users, 
  MessageCircle, 
  HelpCircle,
  Lightbulb,
  Star,
  Heart,
  Trophy,
  Target,
  Zap
} from 'lucide-react';

export const CATEGORY_ICONS = [
  { icon: Megaphone, label: 'Announcements', color: '#FF4B4B' },
  { icon: Globe2, label: 'General', color: '#3B82F6' },
  { icon: Gem, label: 'Premium', color: '#8B5CF6' },
  { icon: Users, label: 'Community', color: '#10B981' },
  { icon: MessageCircle, label: 'Discussion', color: '#F59E0B' },
  { icon: HelpCircle, label: 'Q&A', color: '#EC4899' },
  { icon: Lightbulb, label: 'Ideas', color: '#6366F1' },
  { icon: Star, label: 'Featured', color: '#F97316' },
  { icon: Heart, label: 'Social', color: '#EF4444' },
  { icon: Trophy, label: 'Achievements', color: '#FCD34D' },
  { icon: Target, label: 'Goals', color: '#14B8A6' },
  { icon: Zap, label: 'Quick Updates', color: '#8B5CF6' },
] as const; 