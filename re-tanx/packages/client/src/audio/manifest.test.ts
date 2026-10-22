/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import manifest from "../../../../data/audio.json";

const dir = new URL("../../public/audio", import.meta.url).pathname;

describe("audio manifest", () => {
  it("every listed sound has a file, and every file is listed", () => {
    const files = readdirSync(join(dir, "sfx")).map((f) => f.replace(/\.wav$/, "")).sort();
    expect(Object.keys(manifest.sfx).sort()).toEqual(files);
    for (const m of Object.values(manifest.music)) expect(existsSync(join(dir, m.file))).toBe(true);
  });

  it("levels are sane", () => {
    for (const s of Object.values(manifest.sfx)) {
      expect(s.volume).toBeGreaterThan(0);
      expect(s.volume).toBeLessThanOrEqual(1);
      expect(s.voices).toBeGreaterThanOrEqual(1);
    }
  });
});
