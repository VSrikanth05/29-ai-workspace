import type { Metadata } from 'next';
import { ResetPasswordPageContent } from '@/features/auth/components/auth-pages';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() { return <ResetPasswordPageContent />; }
