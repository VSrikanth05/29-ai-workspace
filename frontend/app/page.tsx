import type { Metadata } from 'next';
import { LandingPage } from '@/features/landing/components/landing-page';

export const metadata: Metadata = { title: 'One Workspace. Unlimited Possibilities.' };

export default function HomePage() { return <LandingPage />; }
