const localCache = new Map<string, { expires: number; value: unknown }>();
let nextLocalNominatimRequestAt = 0;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redisCommand<T>(command: unknown[]): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(1500),
      cache: "no-store"
    });
    if (!response.ok) return null;
    const payload = await response.json() as { result?: T };
    return payload.result === undefined ? null : payload.result;
  } catch {
    return null;
  }
}

/** Read-through JSON cache. In production, Redis is the shared cache. */
export async function getSharedJson<T>(key: string): Promise<T | null> {
  const result = await redisCommand<unknown>(["GET", `infracis:cache:${key}`]);
  if (typeof result === "string") {
    try { return JSON.parse(result) as T; } catch { return null; }
  }
  if (process.env.NODE_ENV === "production") return null;
  const entry = localCache.get(key);
  if (!entry || entry.expires <= Date.now()) {
    localCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function setSharedJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const serialized = JSON.stringify(value);
  const result = await redisCommand<string>(["SET", `infracis:cache:${key}`, serialized, "EX", String(ttlSeconds)]);
  if (result === "OK") return;
  if (process.env.NODE_ENV === "production") return;
  if (localCache.size >= 2_000) {
    const oldest = localCache.keys().next().value;
    if (oldest !== undefined) localCache.delete(oldest);
  }
  localCache.set(key, { expires: Date.now() + ttlSeconds * 1000, value });
}

/**
 * Reserve an application-wide Nominatim request slot atomically in Redis.
 * Returns false in production if the shared store cannot reserve a slot.
 */
export async function waitForNominatimSlot(): Promise<boolean> {
  const config = redisConfig();
  if (config) {
    const script = [
      "local now = tonumber(ARGV[1])",
      "local spacing = tonumber(ARGV[2])",
      "local nextAt = tonumber(redis.call('GET', KEYS[1]) or '0')",
      "local scheduled = math.max(now, nextAt)",
      "redis.call('SET', KEYS[1], scheduled + spacing, 'PX', ARGV[3])",
      "return scheduled - now"
    ].join("\\n");
    const wait = await redisCommand<number>(["EVAL", script, "1", "infracis:provider:nominatim:next", String(Date.now()), "1100", "30000"]);
    if (wait === null || !Number.isFinite(wait) || wait < 0 || wait > 8000) return false;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return true;
  }
  if (process.env.NODE_ENV === "production") return false;
  const wait = Math.max(0, nextLocalNominatimRequestAt - Date.now());
  nextLocalNominatimRequestAt = Math.max(Date.now(), nextLocalNominatimRequestAt) + 1100;
  if (wait > 8000) return false;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return true;
}
