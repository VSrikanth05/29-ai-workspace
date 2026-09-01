import type { Metadata } from 'next';
import { ForgotPasswordPageContent } from '@/features/auth/components/auth-pages';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() { return <ForgotPasswordPageContent />; }
