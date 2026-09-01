import { expect, test, type Page } from '@playwright/test';

const workspace = { id: '11111111-1111-4111-8111-111111111111', name: 'Production workspace', ownerId: 'user-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), members: [{ role: 'OWNER' }], _count: { documents: 1, members: 1 } };
const output = { id: 'out-1', type: 'SUMMARY', title: 'Production summary', provider: 'openai', model: 'gpt-test', workspaceId: workspace.id, conversationId: 'chat-1', createdAt: new Date().toISOString(), content: { format: 'markdown', markdown: '# Verified output' }, sources: [] };

async function mockApi(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('29ai.access-token', 'e2e-token');
    localStorage.setItem('29ai.refresh-token', 'e2e-refresh-token');
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://localhost:5000' && !url.pathname.startsWith('/api/')) return route.continue();
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/me') return json({ id: 'user-1', email: 'e2e@example.com', name: 'E2E User' });
    if (path === '/workspaces') return json([workspace]);
    if (path.startsWith(`/workspaces/${workspace.id}/sources`)) return route.request().method() === 'GET' ? json({ items: [{ id: 'source-1', originalName: 'release.txt', mimeType: 'text/plain', size: 20, status: 'PROCESSED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], total: 1, nextCursor: null }) : json({ message: 'Source uploaded successfully' });
    if (path === '/collections') return route.request().method() === 'GET' ? json([{ id: 'collection-1', name: 'Release notes', parentId: null, position: 0, items: [], _count: { items: 1, children: 0 } }]) : json({ id: 'collection-2', name: 'Created' });
    if (path === '/tags') return json([]);
    if (path === '/favorites') return json([]);
    if (path === '/preferences') return json({ workspaceId: workspace.id, defaultProvider: 'openai', defaultModel: 'gpt-test', language: 'en', theme: 'system', defaultExportFormat: 'markdown', streaming: true, autosave: true });
    if (path.startsWith('/search')) return json({ query: 'release', total: 1, groups: { sources: [{ id: 'source-1', kind: 'source', label: 'release.txt', highlight: [{ text: 'release', match: true }, { text: '.txt', match: false }] }], conversations: [], outputs: [], collections: [], tags: [] } });
    if (path.startsWith('/ai-studio/outputs')) return url.searchParams.has('limit') ? json({ items: [output], nextCursor: null }) : json([output]);
    if (path === '/providers') return json([{ id: 'openai', name: 'OpenAI', configured: true, models: ['gpt-test'] }]);
    if (path === '/models') return json([{ id: 'gpt-test', provider: 'openai', name: 'gpt-test', configured: true }]);
    if (path === '/conversations' || path === '/chat/sessions') return json([]);
    if (path === '/share' && route.request().method() === 'POST') return json({ id: 'share-1', url: 'http://127.0.0.1:3000/shared/token' });
    if (path.includes('/export')) return json({ filename: 'output.md', mimeType: 'text/markdown', content: '# Export' });
    if (path.startsWith('/ai-studio/')) return json(output);
    if (path === '/ai/chat/stream') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'event: delta\ndata: {"type":"delta","content":"Verified"}\n\nevent: done\ndata: {"type":"done","conversationId":"chat-1","message":{"id":"m1","role":"assistant","content":"Verified"},"sources":[],"finishReason":"stop"}\n\n' });
    return json({});
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('29ai.access-token', 'e2e-token');
    localStorage.setItem('29ai.refresh-token', 'e2e-refresh-token');
    window.dispatchEvent(new Event('29ai:auth-change'));
  });
}

test.beforeEach(async ({ page }) => mockApi(page));

async function activateSession(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('29ai:auth-change')));
}

test('authentication, workspace, upload, chat, and streaming', async ({ page }) => {
  await page.goto('/workspace'); await activateSession(page); await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
  await page.getByLabel('Choose files').setInputFiles({ name: 'release.txt', mimeType: 'text/plain', buffer: Buffer.from('release') });
  await page.getByRole('button', { name: /Upload 1/ }).click();
  await page.getByPlaceholder('Ask anything about your sources').fill('Verify the release'); await page.keyboard.press('Enter');
  await expect(page.getByText('Verified')).toBeVisible();
});

test('collections, global search, and preferences', async ({ page }) => {
  await page.goto('/collections'); await activateSession(page); await expect(page.getByText('Release notes')).toBeVisible();
  await page.keyboard.press('Control+k'); await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible(); await page.keyboard.press('Escape');
  await page.evaluate(() => window.dispatchEvent(new Event('29ai:search'))); await page.getByRole('textbox', { name: 'Search workspace' }).fill('release'); await expect(page.getByText('release', { exact: true })).toBeVisible();
  await page.goto('/settings'); await activateSession(page); await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible(); await page.getByRole('button', { name: /Save preferences/ }).click();
});

test('AI Studio, analytics, exports, sharing, and Output Library', async ({ page }) => {
  await page.goto('/workspace'); await activateSession(page); await expect(page.getByRole('heading', { name: 'AI Studio' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Collapse AI Studio' })).toBeVisible();
  await page.goto('/outputs'); await expect(page.getByText('Production summary')).toBeVisible(); await page.getByRole('button', { name: 'Share Production summary' }).click(); await page.getByRole('button', { name: 'Generate link' }).click(); await expect(page.getByLabel('Share link')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Production summary' })).toBeVisible();
});
