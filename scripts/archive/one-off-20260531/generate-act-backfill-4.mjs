#!/usr/bin/env node
/** Backfill hanh_dong_khac_phuc_jsonb cho 4 mẫu canonical thiếu ACT seed. */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANONICAL_MD = path.join(__dirname, "../docs/data/bang-kiem/canonical-36.md");
const OUT = path.join(
  __dirname,
  "../supabase/migrations/20260528000010_gstt_canonical_36_act_backfill_fix.sql",
);

const NEED = ["BM.10.01", "BM.27.02", "BM.QĐ.19.03", "BM.QĐ.20.01"];

function stripMd(s) {
  return String(s || "")
    .replace(/\\([_\\[\]()])/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function parseActionsFromP4(p4) {
  const actions = [];
  let stt = 0;
  for (const line of p4.split("\n")) {
    if (!/\\?\[ACT-\d{3}\\?\]/i.test(line)) continue;
    const actM = line.match(/\\?\[ACT-(\d{3})\\?\]/i);
    if (!actM) continue;
    stt += 1;
    let text = line;
    text = text.replace(/^\*\s*\\?\[\s*\]\s*/i, "");
    text = text.replace(/\\?\[ACT-\d{3}\\?\]/gi, "");
    text = text.replace(/\*\s*\[\s*\]\s*/g, " ");
    text = stripMd(text).replace(/\s+/g, " ").trim();
    actions.push({
      stt,
      noi_dung: text,
      action_code: `ACT-${actM[1]}`,
      la_stop_the_line: actM[1] === "400",
    });
  }
  return actions;
}

const md = readFileSync(CANONICAL_MD, "utf8");
const re =
  /<!-- BANG_KIEM_START -->\n```yaml\n([\s\S]*?)```\n\n## ([^\n]+)\n\n([\s\S]*?)\n\n---\n\n<!-- BANG_KIEM_END -->/g;

const out = [
  "-- 20260528000010_gstt_canonical_36_act_backfill_fix.sql",
  "-- Sửa hanh_dong_khac_phuc_jsonb cho 4 mẫu (000009 parse ACT sai do markdown escape)",
  "begin;",
  "",
];

let m;
while ((m = re.exec(md)) !== null) {
  const ma = m[2].trim();
  if (!NEED.includes(ma)) continue;
  const p4 = m[3].split(/\*\*PHẦN 4/i)[1]?.split(/\n\*\*Chữ ký/i)[0] || "";
  const actions = parseActionsFromP4(p4);
  console.log(`${ma}: ${actions.length} actions`);
  out.push(`-- ${ma}`);
  out.push(
    `update public.gstt_dm_bang_kiem set hanh_dong_khac_phuc_jsonb = $jsonb$${JSON.stringify(actions)}$jsonb$::jsonb where ma_bk = '${ma}';`,
  );
  out.push("");
}

out.push("commit;");
writeFileSync(OUT, out.join("\n"), "utf8");
console.log(`Wrote ${OUT}`);
