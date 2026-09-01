import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/providers/app-providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '29 AI Workspace', template: '%s · 29 AI Workspace' },
  description: 'One Workspace. Unlimited Possibilities. Powered by 29 AI Studio Tools.',
  applicationName: '29 AI Workspace',
};

export const viewport: Viewport = { colorScheme: 'light dark', themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f8f8fb' }, { media: '(prefers-color-scheme: dark)', color: '#16151d' }] };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><AppProviders>{children}</AppProviders></body></html>;
}
