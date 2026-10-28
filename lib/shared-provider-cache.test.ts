import { afterEach, describe, expect, it, vi } from "vitest";
import { getSharedJson, setSharedJson } from "./shared-provider-cache";

const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
});

describe("shared provider JSON cache", () => {
  it("round-trips values in the local development fallback", async () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const key = `test:round-trip:${Date.now()}`;
    const value = { provider: "weather", temperature: 22.5, nested: { valid: true } };
    await setSharedJson(key, value, 60);

    await expect(getSharedJson(key)).resolves.toEqual(value);
  });

  it("keeps cache keys isolated", async () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const suffix = Date.now().toString();
    await setSharedJson(`test:key-a:${suffix}`, { label: "A" }, 60);
    await setSharedJson(`test:key-b:${suffix}`, { label: "B" }, 60);

    await expect(getSharedJson(`test:key-a:${suffix}`)).resolves.toEqual({ label: "A" });
    await expect(getSharedJson(`test:key-b:${suffix}`)).resolves.toEqual({ label: "B" });
  });

  it("uses Redis GET and SET with namespaced keys and expiry", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test/";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: "OK" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: JSON.stringify({ value: 42 }) }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await setSharedJson("weather:28.6:77.2", { value: 42 }, 300);
    await expect(getSharedJson("weather:28.6:77.2")).resolves.toEqual({ value: 42 });

    const setCall = fetchMock.mock.calls[0] as [string, RequestInit];
    const getCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(setCall[0]).toBe("https://redis.example.test");
    expect(JSON.parse(String(setCall[1].body))).toEqual([
      "SET",
      "infracis:cache:weather:28.6:77.2",
      JSON.stringify({ value: 42 }),
      "EX",
      "300"
    ]);
    expect(JSON.parse(String(getCall[1].body))).toEqual([
      "GET",
      "infracis:cache:weather:28.6:77.2"
    ]);
    expect((setCall[1].headers as Record<string, string>).Authorization).toBe("Bearer unit-test-token");
  });

  it("returns a cache miss rather than stale local data when production Redis fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Redis unavailable")));

    await expect(getSharedJson("weather:redis-outage-test")).resolves.toBeNull();
  });

  it("treats malformed Redis JSON as a cache miss", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: "{not-json" }), { status: 200 })
    ));

    await expect(getSharedJson("weather:malformed-cache-test")).resolves.toBeNull();
  });
});
