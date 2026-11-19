#!/usr/bin/env node
// Cổng ADR cho migration mới (LC2, KH_KSNK_20261119 §5 bước 2–3). Bổ sung guard-migrations.mjs (không sửa file đó).
// Migration version > supabase/PROD_HEAD phải có dòng `-- ADR: docs/adr/<tên>.md`; file đó phải tồn tại và có
// mục `## Phương án`, `## Phản biện`, `## Chọn` (mỗi mục ≥ 1 dòng nội dung).
//  - Lint:  node scripts/guard-adr.mjs            quét mọi migration > PROD_HEAD; exit 1 nếu sai.
//  - Hook:  node scripts/guard-adr.mjs --hook     PreToolUse Write: chặn (exit 2) khi tạo/ghi migration > head sai ADR.
//           (Edit/MultiEdit/Bash không xét ở hook; lint bắt.)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.GUARD_ADR_ROOT ? resolve(process.env.GUARD_ADR_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_RE = /(?:^|\/)supabase\/migrations\/(\d{14})_[^/]+\.sql$/;
const ADR_LINE = /^--\s*ADR:\s*(docs\/adr\/[\w.\-]+\.md)\s*$/m;
const SECTIONS = ["Phương án", "Phản biện", "Chọn"];

const prodHead = () => {
  const first = readFileSync(join(ROOT, "supabase/PROD_HEAD"), "utf8").split("\n")[0].trim();
  if (!/^\d{14}$/.test(first)) throw new Error(`supabase/PROD_HEAD dòng 1 phải là 14 chữ số, thấy «${first}»`);
  return first;
};

function sectionBody(md, title) {
  const m = new RegExp(`^##\\s+${title}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, "m").exec(md);
  return m ? m[1].trim() : null;
}

/** Trả danh sách lỗi cho một migration (nội dung `sql`, tên hiển thị `name`). */
export function checkAdr(sql, name) {
  const m = ADR_LINE.exec(sql);
  if (!m) return [`${name}: thiếu dòng «-- ADR: docs/adr/<tên>.md» (phải trỏ tới file ADR, không phải văn xuôi)`];
  const adrPath = join(ROOT, m[1]);
  if (!existsSync(adrPath)) return [`${name}: ADR «${m[1]}» không tồn tại — viết ADR (≥ 2 phương án + phản biện) trước khi mở migration`];
  const md = readFileSync(adrPath, "utf8");
  return SECTIONS.filter((s) => !sectionBody(md, s)).map((s) => `${name}: ${m[1]} thiếu mục «## ${s}» hoặc mục rỗng`);
}

function lint(head) {
  const dir = join(ROOT, "supabase/migrations");
  const errs = [];
  for (const f of readdirSync(dir).sort()) {
    const v = (FILE_RE.exec(`supabase/migrations/${f}`) || [])[1];
    if (v && v > head) errs.push(...checkAdr(readFileSync(join(dir, f), "utf8"), f));
  }
  if (errs.length) {
    console.error(`[guard-adr] FAIL (PROD_HEAD ${head}):\n- ${errs.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`[guard-adr] OK (PROD_HEAD ${head})`);
}

function hook(head) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }
  if (input.tool_name !== "Write") process.exit(0);
  const ti = input.tool_input || {};
  const fp = ti.file_path ? String(ti.file_path) : "";
  const rel = (isAbsolute(fp) ? relative(ROOT, fp) : fp).replaceAll("\\", "/");
  const v = (FILE_RE.exec(rel) || [])[1];
  if (!v || v <= head) process.exit(0);
  const errs = checkAdr(String(ti.content || ""), rel);
  if (errs.length) {
    console.error(`[guard-adr] CHẶN: ${errs.join("; ")}`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let head;
  try { head = prodHead(); } catch (e) { console.error(`[guard-adr] ${e.message}`); process.exit(process.argv.includes("--hook") ? 2 : 1); }
  if (process.argv.includes("--hook")) hook(head); else lint(head);
}
