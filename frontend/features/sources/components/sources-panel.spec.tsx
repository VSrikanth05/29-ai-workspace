import { fireEvent, render, screen } from '@testing-library/react';
import { SourcesPanel } from './sources-panel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('SourcesPanel', () => {
  it('exposes accessible source controls and queues selected files', () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SourcesPanel /></QueryClientProvider>);
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search sources' })).toBeInTheDocument();

    const input = screen.getByLabelText('Choose files');
    const file = new File(['knowledge'], 'research.md', { type: 'text/markdown' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('research.md')).toBeInTheDocument();
    expect(screen.getByText('1 ready to add')).toBeInTheDocument();
  });
});
