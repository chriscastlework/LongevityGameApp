import {
  Activity,
  Heart,
  Zap,
  Scale,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
  LucideIcon
} from 'lucide-react';

// Map of icon names to Lucide icon components
export const iconMap: Record<string, LucideIcon> = {
  Activity,
  Heart,
  Zap,
  Scale,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
};

// Get icon component by name, with fallback to Activity
export function getIconByName(iconName: string): LucideIcon {
  return iconMap[iconName] || Activity;
}

// Get all available icon names
export function getAvailableIconNames(): string[] {
  return Object.keys(iconMap);
}