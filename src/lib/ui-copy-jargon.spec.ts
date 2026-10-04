/**
 * Chặn jargon nội bộ lộ trên chuỗi UI (khóa domain 27 #5).
 * Quét literal trong .tsx và các file dưới thư mục lib — bỏ comment.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { MSG_NO_EMERGENCY_IMPLANT_RELEASE } from "@/modules/cssd-erp/lib/me-tiet-khuan-ab-gates";

const ROOT = join(process.cwd(), "src");
const FORBIDDEN =
  /\bSoft\b|SSOT|Domain \d|cite |PO [A-Z]\.\d|used_clinically|alias hub|Form gốc|Cửa GSC/;
const FORBIDDEN_STRONG = /<strong>[A-Z_]{5,}<\/strong>/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p, acc);
      continue;
    }
    if (p.endsWith(".spec.ts") || p.endsWith(".spec.tsx") || p.endsWith(".test.ts")) continue;
    const norm = p.replace(/\\/g, "/");
    if (norm.endsWith(".tsx") || /\/lib\/.+\.ts$/.test(norm)) acc.push(p);
  }
  return acc;
}

/** Bỏ comment khối / dòng rồi lấy literal "…" '…' `…` (đơn giản). */
function extractLiterals(src: string): string[] {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const noLine = noBlock
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
  const out: string[] = [];
  const re = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noLine))) {
    // Bỏ biểu thức ${…} trong template — tránh khớp tên thuộc tính DB.
    out.push(m[2].replace(/\$\{[^}]*\}/g, ""));
  }
  return out;
}

describe("ui-copy-jargon", () => {
  it("MSG_NO_EMERGENCY_IMPLANT_RELEASE has no Soft", () => {
    expect(MSG_NO_EMERGENCY_IMPLANT_RELEASE).not.toMatch(/Soft/);
  });

  it("UI string literals have no forbidden jargon tokens", () => {
    const files = walk(ROOT);
    const hits: string[] = [];
    for (const file of files) {
      const raw = readFileSync(file, "utf8");
      const rel = relative(process.cwd(), file);
      for (const lit of extractLiterals(raw)) {
        if (FORBIDDEN.test(lit)) {
          const m = lit.match(FORBIDDEN);
          hits.push(`${rel}: «${m?.[0]}» in ${lit.slice(0, 80)}`);
        }
      }
      if (file.endsWith(".tsx")) {
        const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "");
        if (FORBIDDEN_STRONG.test(noBlock)) {
          hits.push(`${rel}: ${noBlock.match(FORBIDDEN_STRONG)?.[0]}`);
        }
      }
    }
    expect(hits, hits.slice(0, 25).join("\n")).toEqual([]);
  });
});
