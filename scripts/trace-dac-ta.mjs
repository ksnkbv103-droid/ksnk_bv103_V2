#!/usr/bin/env node
// Truy vết đặc tả → code: đếm quy tắc (R) và ca kiểm thử (T) của đặc tả M01–M15
// đã được code/test dẫn mã bằng chú thích `@dac-ta R1.12` (nhiều mã cách nhau dấu phẩy).
// Dùng: npm run trace [-- M01] [--thieu] ; thoát 1 khi code dẫn mã không có trong đặc tả.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { readSpec, specDir } from "./lib/dac-ta.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const onlyModule = args.find((a) => /^M\d{2}$/.test(a));
const showMissing = args.includes("--thieu");

// Mã được định nghĩa = mã đứng đầu một hàng bảng: `| R1.12 | ...` hoặc `| T3.01 (TH3.01) | ...` (M03, M12)
const spec = readSpec();
if (!spec) {
  console.error(`Không thấy thư mục đặc tả: ${specDir} (đặt KSNK_DAC_TA để chỉ đường dẫn)`);
  process.exit(2);
}
const defined = new Map(); // mã → module
for (const r of spec) if (!defined.has(r.ma)) defined.set(r.ma, r.module);

const cited = new Map(); // mã → [file:dòng]
const todoCodes = new Set(); // mã có `it.todo("T1.01 …")` (do dac-ta-test.mjs sinh), chưa tính là đã dẫn
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|sql|mjs)$/.test(name)) {
      readFileSync(p, "utf8")
        .split("\n")
        .forEach((line, i) => {
          const t = line.match(/\bit\.todo\(\s*["'`]([RT]\d+\.\d+[a-z]?)\b/);
          if (t) todoCodes.add(t[1]);
          const m = line.match(/@dac-ta\s+([RT0-9.,\sa-z]+)/);
          if (!m) return;
          for (const code of m[1].match(/[RT]\d+\.\d+[a-z]?/g) ?? []) {
            if (!cited.has(code)) cited.set(code, []);
            cited.get(code).push(`${relative(root, p)}:${i + 1}`);
          }
        });
    }
  }
};
for (const d of ["src", "supabase/migrations"]) if (existsSync(join(root, d))) walk(join(root, d));

const mods = [...new Set(defined.values())].sort().filter((m) => !onlyModule || m === onlyModule);
console.log("Module  R có dẫn/tổng   T có dẫn/tổng   T todo");
for (const mod of mods) {
  const codes = [...defined].filter(([, m]) => m === mod).map(([c]) => c);
  const stat = (k) => {
    const all = codes.filter((c) => c.startsWith(k));
    return [all.filter((c) => cited.has(c)).length, all.length, all.filter((c) => !cited.has(c))];
  };
  const [rc, rn, rMiss] = stat("R");
  const [tc, tn, tMiss] = stat("T");
  const todo = codes.filter((c) => c.startsWith("T") && todoCodes.has(c) && !cited.has(c)).length;
  console.log(`${mod}     ${String(rc).padStart(3)}/${String(rn).padEnd(3)}        ${String(tc).padStart(3)}/${String(tn).padEnd(3)}        ${String(todo).padStart(3)}`);
  if (showMissing) console.log(`  R chưa dẫn: ${rMiss.join(" ") || "—"}\n  T chưa dẫn: ${tMiss.join(" ") || "—"}`);
}

const unknown = [...cited].filter(([c]) => !defined.has(c));
if (unknown.length) {
  console.error("\nMã dẫn trong code nhưng KHÔNG có trong đặc tả:");
  for (const [c, where] of unknown) console.error(`  ${c}  ${where.join(", ")}`);
  process.exit(1);
}
