import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit } from "./distributed-rate-limit";
import { waitForNominatimSlot } from "./shared-provider-cache";

const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shared rate limiter", () => {
  it("fails closed in production when shared Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    await expect(enforceRateLimit("test-client", 2)).resolves.toBeNull();
    await expect(waitForNominatimSlot()).resolves.toBe(false);
  });

  it("uses the Redis atomic counter result when configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: [3, 42_000] })
    }));
    await expect(enforceRateLimit("test-client", 2)).resolves.toMatchObject({
      allowed: false,
      remaining: 0
    });
  });

  it("fails closed when the shared Redis service is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    await expect(enforceRateLimit("test-client", 2)).resolves.toBeNull();
  });

  it("reserves a Nominatim request slot atomically through Redis", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 0 })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(waitForNominatimSlot()).resolves.toBe(true);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://redis.example.test");
    const command = JSON.parse(String(options.body)) as string[];
    expect(command[0]).toBe("EVAL");
    expect(command[1]).toContain("math.max(now, nextAt)");
    expect(command[1]).toContain("redis.call('SET', KEYS[1]");
    expect(command[5]).toBe("1100");
  });

  it("rejects a Nominatim slot that would wait beyond the bounded request budget", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 9001 })
    }));

    await expect(waitForNominatimSlot()).resolves.toBe(false);
  });
});
