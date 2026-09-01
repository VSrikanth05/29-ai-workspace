import type { Metadata } from 'next';
import { WorkspaceShell } from '@/features/workspace/components/workspace-shell';

export const metadata: Metadata = { title: 'Workspace' };

export default function WorkspacePage() {
  return <WorkspaceShell />;
}
