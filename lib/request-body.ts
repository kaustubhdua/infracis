import { NextRequest } from "next/server";

export type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

/** Read JSON without buffering an unbounded request body into memory. */
export async function readJsonWithLimit(
  request: NextRequest,
  maxBytes = 16 * 1024
): Promise<BoundedJsonResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return { ok: false, status: 413, error: "Request body is too large." };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Request body must contain a JSON object." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: "Request body is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Could not read request body." };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON request body." };
  }
}
