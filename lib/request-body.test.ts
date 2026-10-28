import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { readJsonWithLimit } from "./request-body";

describe("readJsonWithLimit", () => {
  it("parses a valid JSON body", async () => {
    const request = new NextRequest("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "Noida" })
    });
    await expect(readJsonWithLimit(request)).resolves.toEqual({
      ok: true,
      value: { query: "Noida" }
    });
  });

  it("rejects an oversized declared body before parsing", async () => {
    const request = new NextRequest("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "500" },
      body: JSON.stringify({ query: "Noida" })
    });
    await expect(readJsonWithLimit(request, 100)).resolves.toEqual({
      ok: false,
      status: 413,
      error: "Request body is too large."
    });
  });

  it("rejects oversized streamed bodies without a content-length header", async () => {
    const request = new NextRequest("http://localhost/api", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("123456789"));
          controller.close();
        }
      }),
      duplex: "half"
    } as unknown as RequestInit);
    await expect(readJsonWithLimit(request, 8)).resolves.toEqual({
      ok: false,
      status: 413,
      error: "Request body is too large."
    });
  });

  it("rejects malformed JSON", async () => {
    const request = new NextRequest("http://localhost/api", {
      method: "POST",
      body: "{invalid"
    });
    await expect(readJsonWithLimit(request)).resolves.toEqual({
      ok: false,
      status: 400,
      error: "Invalid JSON request body."
    });
  });
});
