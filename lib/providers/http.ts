const RETRYABLE_STATUSES = new Set([408, 500, 502, 503, 504]);

/**
 * Bounded retry for transient upstream/network failures.
 * Never retries 429/406 so provider backoff is respected.
 */
export async function fetchWithTransientRetry(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 8_000,
  retryDelayMs = 250
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (attempt === 1 || !RETRYABLE_STATUSES.has(response.status)) return response;

      try {
        await response.body?.cancel();
      } catch {
        // Closing a failed response is best-effort; the next attempt remains bounded.
      }
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    }

    if (retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Upstream request failed after a bounded retry.");
}
