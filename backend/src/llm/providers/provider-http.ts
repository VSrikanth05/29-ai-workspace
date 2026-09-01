export interface ProviderRequestPolicy {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

/**
 * Applies one bounded request policy to all network-backed LLM adapters.
 * Retries are limited to transient transport/server/rate-limit failures and
 * happen before a streaming body is consumed, so partial generations are
 * never replayed.
 */
export async function fetchProvider(
  input: string,
  init: RequestInit,
  policy: ProviderRequestPolicy = {},
): Promise<Response> {
  const timeoutMs = Math.max(1_000, policy.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const maxRetries = Math.max(0, Math.min(5, policy.maxRetries ?? DEFAULT_MAX_RETRIES));

  for (let attempt = 0; ; attempt += 1) {
    if (policy.signal?.aborted) throw policy.signal.reason ?? new DOMException('The request was aborted.', 'AbortError');
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = policy.signal ? AbortSignal.any([policy.signal, timeout]) : timeout;
    try {
      const response = await fetch(input, { ...init, signal });
      if (!isRetryable(response.status) || attempt >= maxRetries) return response;
      await response.body?.cancel();
      await backoff(attempt, policy.signal);
    } catch (error) {
      if (policy.signal?.aborted) throw policy.signal.reason ?? error;
      if (attempt >= maxRetries) throw error;
      await backoff(attempt, policy.signal);
    }
  }
}

function isRetryable(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function backoff(attempt: number, signal?: AbortSignal) {
  const delayMs = Math.min(2_000, 250 * 2 ** attempt);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    if (!signal) return;
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('The request was aborted.', 'AbortError'));
    };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export function providerPolicy(config: { get<T>(name: string): T | undefined }) {
  const timeout = Number(config.get<string>('LLM_REQUEST_TIMEOUT_MS'));
  const retries = Number(config.get<string>('LLM_MAX_RETRIES'));
  return {
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
    maxRetries: Number.isFinite(retries) && retries >= 0 ? retries : DEFAULT_MAX_RETRIES,
  };
}
