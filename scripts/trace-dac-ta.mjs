#!/usr/bin/env node
// Truy vết đặc tả → code: đếm quy tắc (R) và ca kiểm thử (T) của đặc tả M01–M15
// đã được code/test dẫn mã bằng chú thích `@dac-ta R1.12` (nhiều mã cách nhau dấu phẩy).
// Dùng: npm run trace [-- M01] [--thieu] ; thoát 1 khi code dẫn mã không có trong đặc tả.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { homedir } from "node:os";

const root = process.cwd();
const specDir =
  process.env.KSNK_DAC_TA ??
  join(homedir(), "Desktop/KSNK_BENH_VIEN_103/09_DOMAIN_PHAN_MEM/02_DAC_TA");
const args = process.argv.slice(2);
const onlyModule = args.find((a) => /^M\d{2}$/.test(a));
const showMissing = args.includes("--thieu");

if (!existsSync(specDir)) {
  console.error(`Không thấy thư mục đặc tả: ${specDir} (đặt KSNK_DAC_TA để chỉ đường dẫn)`);
  process.exit(2);
}

// Mã được định nghĩa = mã đứng đầu một hàng bảng: `| R1.12 | ...`
const defined = new Map(); // mã → module
for (const f of readdirSync(specDir).filter((n) => /^M\d{2}_.*\.md$/.test(n))) {
  const mod = f.slice(0, 3);
  for (const line of readFileSync(join(specDir, f), "utf8").split("\n")) {
    const m = line.match(/^\|\s*((?:R|T)\d+\.\d+[a-z]?)\s*\|/);
    if (m && !defined.has(m[1])) defined.set(m[1], mod);
  }
}

const cited = new Map(); // mã → [file:dòng]
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|sql|mjs)$/.test(name)) {
      readFileSync(p, "utf8")
        .split("\n")
        .forEach((line, i) => {
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
console.log("Module  R có dẫn/tổng   T có dẫn/tổng");
for (const mod of mods) {
  const codes = [...defined].filter(([, m]) => m === mod).map(([c]) => c);
  const stat = (k) => {
    const all = codes.filter((c) => c.startsWith(k));
    return [all.filter((c) => cited.has(c)).length, all.length, all.filter((c) => !cited.has(c))];
  };
  const [rc, rn, rMiss] = stat("R");
  const [tc, tn, tMiss] = stat("T");
  console.log(`${mod}     ${String(rc).padStart(3)}/${String(rn).padEnd(3)}        ${String(tc).padStart(3)}/${String(tn).padEnd(3)}`);
  if (showMissing) console.log(`  R chưa dẫn: ${rMiss.join(" ") || "—"}\n  T chưa dẫn: ${tMiss.join(" ") || "—"}`);
}

const unknown = [...cited].filter(([c]) => !defined.has(c));
if (unknown.length) {
  console.error("\nMã dẫn trong code nhưng KHÔNG có trong đặc tả:");
  for (const [c, where] of unknown) console.error(`  ${c}  ${where.join(", ")}`);
  process.exit(1);
}
