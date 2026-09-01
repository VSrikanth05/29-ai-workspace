import http from 'k6/http';
import { check, sleep } from 'k6';

const base = __ENV.BASE_URL || 'http://localhost:5000';
const token = __ENV.ACCESS_TOKEN;
const workspaceId = __ENV.WORKSPACE_ID;
const sourceId = __ENV.SOURCE_ID;
const outputId = __ENV.OUTPUT_ID;
const uploadFile = open(__ENV.UPLOAD_FILE || './fixtures/load.txt', 'b');
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

export const options = {
  scenarios: {
    workspace_reads: { executor: 'constant-vus', exec: 'reads', vus: Number(__ENV.READ_VUS || 20), duration: __ENV.DURATION || '1m' },
    search: { executor: 'constant-arrival-rate', exec: 'search', rate: Number(__ENV.SEARCH_RPS || 25), timeUnit: '1s', duration: __ENV.DURATION || '1m', preAllocatedVUs: 20, maxVUs: 100 },
    chat_streaming: { executor: 'constant-vus', exec: 'chat', vus: Number(__ENV.CHAT_VUS || 5), duration: __ENV.DURATION || '1m' },
  },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<750', 'p(99)<2000'], 'http_req_duration{name:search}': ['p(95)<300'], checks: ['rate>0.99'] },
};

export function reads() {
  const responses = http.batch([
    ['GET', `${base}/workspaces`, null, { headers, tags: { name: 'workspaces' } }],
    ['GET', `${base}/collections?workspaceId=${workspaceId}`, null, { headers, tags: { name: 'collections' } }],
    ['GET', `${base}/ai-studio/outputs?workspaceId=${workspaceId}&limit=30`, null, { headers, tags: { name: 'outputs' } }],
  ]);
  responses.forEach((response) => check(response, { 'read succeeds': (value) => value.status === 200 })); sleep(1);
}
export function search() { const response = http.get(`${base}/search?workspaceId=${workspaceId}&query=release`, { headers, tags: { name: 'search' } }); check(response, { 'search succeeds': (value) => value.status === 200 }); }
export function chat() { const response = http.post(`${base}/ai/chat/stream`, JSON.stringify({ workspaceId, message: 'Summarize the release', selectedSourceIds: sourceId ? [sourceId] : [] }), { headers: { ...headers, Accept: 'text/event-stream' }, tags: { name: 'streaming' }, timeout: '60s' }); check(response, { 'stream completes': (value) => value.status === 200 && value.body.includes('event: done') }); sleep(1); }

export function uploads() { const response = http.post(`${base}/workspaces/${workspaceId}/sources`, { file: http.file(uploadFile, 'load.txt', 'text/plain') }, { headers: { Authorization: `Bearer ${token}` }, tags: { name: 'upload' } }); check(response, { 'upload accepted': (value) => [200, 201, 202, 429].includes(value.status) }); }
export function analytics() { const response = http.post(`${base}/ai-studio/analytics`, JSON.stringify({ workspaceId, sourceId }), { headers, tags: { name: 'analytics' }, timeout: '60s' }); check(response, { 'analytics succeeds': (value) => value.status < 300 }); }
export function exports() { const response = http.get(`${base}/ai-studio/outputs/${outputId}/export?format=markdown`, { headers, tags: { name: 'export' } }); check(response, { 'export succeeds': (value) => value.status === 200 }); }
