import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android bootstrap", () => {
  it("sets the runtime flag used by the Tauri v2 isTauri check", () => {
    const syncScript = readFileSync(resolve(process.cwd(), "../../scripts/sync-android.mjs"), "utf8");

    expect(syncScript).toContain("window.isTauri = true");
  });

  it("ships a restrictive content security policy", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("frame-src 'none'");
    expect(html).toContain("object-src 'none'");
  });
});
