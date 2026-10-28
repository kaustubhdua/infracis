type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

/**
 * Shared fixed-window limiter backed by Upstash Redis REST.
 * In production, absence/failure of the shared store is an explicit 503 rather
 * than silently pretending an in-memory limiter is global. Local development
 * uses an isolated in-process fallback only.
 */
const localWindows = new Map<string, { start: number; count: number }>();

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const script = [
      "local count = redis.call('INCR', KEYS[1])",
      "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
      "local ttl = redis.call('PTTL', KEYS[1])",
      "return {count, ttl}"
    ].join("\n");
    try {
      const response = await fetch(url.replace(/\/$/, ""), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", script, "1", `infracis:rl:${key}`, String(windowMs)]),
        signal: AbortSignal.timeout(1500),
        cache: "no-store"
      });
      if (!response.ok) return process.env.NODE_ENV === "production" ? null : localLimit(key, limit, windowMs);
      const payload = await response.json() as { result?: [number, number] | null };
      const count = Number(payload.result?.[0]);
      const ttl = Number(payload.result?.[1]);
      if (!Number.isFinite(count) || !Number.isFinite(ttl) || count < 1) {
        return process.env.NODE_ENV === "production" ? null : localLimit(key, limit, windowMs);
      }
      return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: Date.now() + Math.max(0, ttl) };
    } catch {
      return process.env.NODE_ENV === "production" ? null : localLimit(key, limit, windowMs);
    }
  }

  if (process.env.NODE_ENV === "production") return null;
  return localLimit(key, limit, windowMs);
}

function localLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let state = localWindows.get(key);
  if (!state || now - state.start >= windowMs) {
    if (localWindows.size >= 10_000) {
      const oldest = localWindows.keys().next().value;
      if (oldest !== undefined) localWindows.delete(oldest);
    }
    state = { start: now, count: 0 };
    localWindows.set(key, state);
  }
  state.count += 1;
  return { allowed: state.count <= limit, remaining: Math.max(0, limit - state.count), resetAt: state.start + windowMs };
}
