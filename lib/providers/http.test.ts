import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTransientRetry } from "./http";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("bounded upstream retry", () => {
  it("retries a transient 503 once and returns the recovered response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithTransientRetry("https://provider.example/data", {}, 1000, 0);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries one network failure but never retries a rate-limited 429", async () => {
    const networkThenSuccess = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", networkThenSuccess);

    const recovered = await fetchWithTransientRetry("https://provider.example/data", {}, 1000, 0);
    expect(recovered.status).toBe(200);
    expect(networkThenSuccess).toHaveBeenCalledTimes(2);

    const rateLimited = vi.fn().mockResolvedValue(new Response("slow down", { status: 429 }));
    vi.stubGlobal("fetch", rateLimited);
    const response = await fetchWithTransientRetry("https://provider.example/data", {}, 1000, 0);
    expect(response.status).toBe(429);
    expect(rateLimited).toHaveBeenCalledTimes(1);
  });

  it("does not retry ordinary client errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithTransientRetry("https://provider.example/data", {}, 1000, 0);
    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws after two consecutive network failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithTransientRetry("https://provider.example/data", {}, 1000, 0)).rejects.toThrow("fetch failed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
