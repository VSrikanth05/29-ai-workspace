import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { StudioPanel } from './studio-panel';
import { useWorkspaceStore } from '@/stores/workspace-store';

const output = { id: 'o1', type: 'SUMMARY', title: 'Medium Summary', provider: 'openai', model: 'gpt-test', workspaceId: 'w1', conversationId: 'c1', createdAt: '2026-07-28T00:00:00.000Z', content: { format: 'markdown', markdown: '# Result\nGrounded summary.' }, sources: [] };

function renderStudio() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><StudioPanel /></QueryClientProvider>); }

describe('StudioPanel', () => {
  beforeEach(() => {
    window.localStorage.setItem('29ai.access-token', 'token');
    useWorkspaceStore.setState({ selectedToolId: null, activeWorkspaceId: 'w1', selectedSourceIds: [] });
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const body = url.endsWith('/providers') ? [{ id: 'openai', name: 'OpenAI', configured: true, models: ['gpt-test'] }]
        : url.endsWith('/models') ? [{ id: 'gpt-test', provider: 'openai', name: 'gpt-test', configured: true }]
        : url.includes('/ai-studio/summary') && init?.method === 'POST' ? output
        : url.includes('/ai-studio/outputs') ? [] : [];
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }));
  });
  afterEach(() => { window.localStorage.clear(); vi.unstubAllGlobals(); });

  it('configures, runs, saves, and presents a Summary output', async () => {
    renderStudio();
    expect(screen.getByRole('button', { name: 'Collapse AI Studio' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Understand' }));
    fireEvent.click(screen.getByRole('button', { name: /Summarize/ }));
    expect(screen.getByRole('combobox', { name: 'Summary style' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Use Summarize' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Use Summarize' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument());
    expect(screen.getByText('Grounded summary.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Markdown/ })).toBeInTheDocument();
  });

  it('searches and filters the tools catalog', () => {
    renderStudio();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search AI Studio tools' }), { target: { value: 'Image Generation' } });
    expect(screen.getByRole('button', { name: /Image Generation/ })).toBeInTheDocument();
  });
});
