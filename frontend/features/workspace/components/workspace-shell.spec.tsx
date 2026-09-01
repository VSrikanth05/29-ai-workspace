import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceShell } from './workspace-shell';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWorkspace() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><WorkspaceShell /></QueryClientProvider>);
}

describe('WorkspaceShell', () => {
  beforeEach(() => useWorkspaceStore.setState({ activePanel: 'conversation', selectedToolId: null, studioCollapsed: false }));

  it('renders the three semantic workspace regions', async () => {
    renderWorkspace();
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New workspace' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'AI Studio' })).toBeInTheDocument();
  });

  it('supports mobile panel switching', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('tab', { name: 'Sources' }));
    expect(useWorkspaceStore.getState().activePanel).toBe('sources');
  });
});
