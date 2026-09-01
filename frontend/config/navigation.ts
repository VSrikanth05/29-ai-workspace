import type { LucideIcon } from 'lucide-react';
import {
  Clock3,
  Image,
  LayoutDashboard,
  Library,
  Settings,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react';

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  { label: 'Workspace', href: '/workspace', icon: Sparkles },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Media Tools', href: '/media', icon: Image },
  { label: 'AI Studio', href: '/workspace?panel=studio', icon: WandSparkles },
  { label: 'Output Library', href: '/outputs', icon: Library },
  { label: 'History', href: '/history', icon: Clock3 },
  { label: 'Favorites', href: '/favorites', icon: Star },
];

export const SETTINGS_NAVIGATION: NavigationItem = {
  label: 'Settings',
  href: '/settings',
  icon: Settings,
};

export const PROVIDER_SETTINGS_NAVIGATION: NavigationItem = {
  label: 'AI Providers',
  href: '/settings/providers',
  icon: Settings,
};
