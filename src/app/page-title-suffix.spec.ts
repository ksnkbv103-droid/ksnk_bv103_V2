/**
 * IA-07: metadata title không gắn hậu tố (template root thêm «| KSNK 103»).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(process.cwd(), "src/app");
const BAD = /\|\s*(KSNK 103|BV103|KSNK BV103)/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name === "page.tsx" || name === "layout.tsx") acc.push(p);
  }
  return acc;
}

describe("IA-07 page title suffix", () => {
  it("no duplicate suffix in page/layout metadata (except root layout template)", () => {
    const hits: string[] = [];
    for (const file of walk(APP)) {
      const rel = relative(process.cwd(), file);
      if (rel === "src/app/layout.tsx") continue;
      const text = readFileSync(file, "utf8");
      if (!/title\s*:/.test(text)) continue;
      if (BAD.test(text)) hits.push(rel);
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
