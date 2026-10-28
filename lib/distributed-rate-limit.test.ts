import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit, waitForNominatimSlot } from "./distributed-rate-limit";

const originalNodeEnv = process.env.NODE_ENV;
const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  vi.restoreAllMocks();
});

describe("shared rate limiter", () => {
  it("fails closed in production when shared Redis is not configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    await expect(enforceRateLimit("test-client", 2)).resolves.toBeNull();
    await expect(waitForNominatimSlot()).resolves.toBe(false);
  });

  it("uses the Redis atomic counter result when configured", async () => {
    process.env.NODE_ENV = "production";
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
    process.env.NODE_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    await expect(enforceRateLimit("test-client", 2)).resolves.toBeNull();
  });
});
