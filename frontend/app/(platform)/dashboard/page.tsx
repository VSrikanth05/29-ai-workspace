import type { Metadata } from 'next';
import { DashboardPageContent } from '@/features/dashboard/components/dashboard-page';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <DashboardPageContent />;
}
