const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://two9-ai-workspace.onrender.com'
    : '/api')
).replace(/\/$/, '');
export const ACCESS_TOKEN_KEY = '29ai.access-token';
export const REFRESH_TOKEN_KEY = '29ai.refresh-token';
export const LEGACY_ACCESS_TOKEN_KEY = 'access_token';
export const AUTH_CHANGE_EVENT = '29ai:auth-change';
let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function readAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const storages = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    const token = storage.getItem(ACCESS_TOKEN_KEY);
    if (token) return token;
    const legacyToken = storage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    if (legacyToken) {
      storage.setItem(ACCESS_TOKEN_KEY, legacyToken);
      storage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
      return legacyToken;
    }
  }
  return null;
}

export function readRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string, rememberMe = true, refreshToken?: string | null) {
  if (typeof window === 'undefined') return;
  const target = rememberMe ? window.localStorage : window.sessionStorage;
  const other = rememberMe ? window.sessionStorage : window.localStorage;
  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
  other.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  target.setItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) target.setItem(REFRESH_TOKEN_KEY, refreshToken);
  else target.removeItem(REFRESH_TOKEN_KEY);
  target.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  const storages = [window.localStorage, window.sessionStorage];
  const hadToken = storages.some((storage) => Boolean(storage.getItem(ACCESS_TOKEN_KEY) ?? storage.getItem(LEGACY_ACCESS_TOKEN_KEY)));
  for (const storage of storages) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
    storage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  }
  if (hadToken) window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeToAuthChanges(onChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY || event.key === LEGACY_ACCESS_TOKEN_KEY) onChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
  };
}

async function refreshAccessToken() {
  if (typeof window === 'undefined' || !readRefreshToken()) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const payload = await response.json() as { access_token?: string; refresh_token?: string | null };
      if (!payload.access_token) return false;
      const rememberMe = Boolean(window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY));
      setAccessToken(payload.access_token, rememberMe, payload.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const request = () => {
    const token = readAccessToken();
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  };
  let response = await request();
  if (response.status === 401 && await refreshAccessToken()) response = await request();
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    if (response.status === 401) clearAccessToken();
    throw new ApiError(payload?.message ?? `Request failed (${response.status})`, response.status);
  }
  return response.json() as Promise<T>;
}

export async function apiStreamRequest(path: string, body: unknown, signal: AbortSignal): Promise<Response> {
  const request = () => {
    const token = readAccessToken();
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'POST', signal,
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  };
  let response = await request();
  if (response.status === 401 && await refreshAccessToken()) response = await request();
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    if (response.status === 401) clearAccessToken();
    throw new ApiError(payload?.message ?? `Request failed (${response.status})`, response.status);
  }
  return response;
}

export function uploadSource(workspaceId: string, file: File, onProgress: (progress: number) => void): { promise: Promise<void>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open('POST', `${API_BASE_URL}/workspaces/${workspaceId}/sources`);
    const token = readAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100)));
    xhr.addEventListener('load', () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError('Upload failed', xhr.status)));
    xhr.addEventListener('error', () => reject(new Error('Network error while uploading')));
    xhr.addEventListener('abort', () => reject(new DOMException('Upload cancelled', 'AbortError')));
    const body = new FormData();
    body.append('file', file);
    xhr.send(body);
  });
  return { promise, cancel: () => xhr.abort() };
}
