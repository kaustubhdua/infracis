import { describe, expect, it } from "vitest";
import { escapeHtml } from "../lib/escape-html";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters in provider-sourced text", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;"
    );
  });

  it("preserves ordinary place names", () => {
    expect(escapeHtml("St. Mary's Hospital & Clinic")).toBe(
      "St. Mary&#39;s Hospital &amp; Clinic"
    );
  });

  it("returns an empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });
});
