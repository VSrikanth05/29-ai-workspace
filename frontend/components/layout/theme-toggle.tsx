'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const THEMES = ['light', 'dark', 'system'] as const;

export function ThemeToggle() {
  const { theme = 'system', setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="block size-9" aria-hidden="true" />;

  const currentIndex = Math.max(0, THEMES.indexOf(theme as (typeof THEMES)[number]));
  const nextTheme = THEMES[(currentIndex + 1) % THEMES.length] ?? 'system';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Laptop;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Theme: ${theme}. Switch to ${nextTheme}.`}
      title={`Theme: ${theme}`}
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );
}
