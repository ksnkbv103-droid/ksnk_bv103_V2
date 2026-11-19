#!/usr/bin/env node
// Đặc tả → test: sinh khung vitest `it.todo` cho các ca T của một module đặc tả (M01…M15), đầu vào và kết quả trích nguyên văn.
// Dùng: node scripts/dac-ta-test.mjs M01 [--ghi <đường dẫn .spec.ts>]   (không --ghi: in ra stdout; không ghi đè file có sẵn)
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readSpec, specDir } from "./lib/dac-ta.mjs";

function sinh(mod, rows) {
  const seen = new Set();
  const ca = rows.filter((r) => r.module === mod && r.ma.startsWith("T") && !seen.has(r.ma) && seen.add(r.ma));
  const todo = ca.map((r) => {
    const [vao = "", ...ra] = r.cells;
    return `  it.todo(${JSON.stringify(`${r.ma} | vào: ${vao} | ra: ${ra.join(" | ")}`)});`;
  });
  return { n: ca.length, text: [
    `// Sinh bởi scripts/dac-ta-test.mjs ${mod}: ${ca.length} ca T của ${ca.length ? rows.find((r) => r.module === mod).file : mod}, trích nguyên văn.`,
    "// Viết ca thật: đổi it.todo thành it(...) và ghi thẻ dẫn mã đặc tả ngay trên ca (cú pháp ở scripts/trace-dac-ta.mjs); `npm run trace` đếm todo / có dẫn.",
    'import { describe, it } from "vitest";',
    "",
    `describe(${JSON.stringify(`${mod} · ca T của đặc tả`)}, () => {`,
    ...todo,
    "});",
    "",
  ].join("\n") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const mod = args.find((a) => /^M\d{2}$/.test(a));
  const gi = args.indexOf("--ghi");
  const out = gi >= 0 ? args[gi + 1] : null;
  if (!mod || (gi >= 0 && !out)) { console.error("Dùng: node scripts/dac-ta-test.mjs M01 [--ghi <đường dẫn .spec.ts>]"); process.exit(2); }
  const rows = readSpec();
  if (!rows) { console.error(`Không thấy thư mục đặc tả: ${specDir} (đặt KSNK_DAC_TA để chỉ đường dẫn)`); process.exit(2); }
  const { n, text } = sinh(mod, rows);
  if (!n) { console.error(`${mod}: không có ca T nào trong đặc tả`); process.exit(1); }
  if (!out) process.stdout.write(text);
  else if (existsSync(out)) { console.error(`${out} đã có: không ghi đè`); process.exit(1); }
  else { writeFileSync(out, text); console.log(`${out}: ${n} it.todo`); }
}
