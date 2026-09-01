import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ConversationPanel } from './conversation-panel';

describe('ConversationPanel', () => {
  beforeEach(() => {
    window.localStorage.setItem('29ai.access-token', 'test-token');
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
      const url = String(input);
      const body = url.endsWith('/providers') ? [{ id: 'openai', name: 'OpenAI', configured: true, models: ['gpt-test'] }]
        : url.endsWith('/models') ? [{ id: 'gpt-test', provider: 'openai', name: 'gpt-test', configured: true }]
        : [];
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }));
  });
  afterEach(() => { window.localStorage.clear(); vi.unstubAllGlobals(); });

  it('keeps the main conversation focused and exposes the composer accessibly', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ConversationPanel /></QueryClientProvider>);
    expect(screen.getByRole('heading', { name: 'New workspace' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Conversations' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument();
    expect(screen.queryByText('Generation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'What are the key ideas?' }));
    expect(screen.getByLabelText('Ask about your sources')).toHaveValue('What are the key ideas?');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled());
  });
});
