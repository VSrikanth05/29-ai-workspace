import type { Metadata } from 'next';
import { RegisterPageContent } from '@/features/auth/components/auth-pages';

export const metadata: Metadata = { title: 'Create your account' };

export default function RegisterPage() { return <RegisterPageContent />; }
