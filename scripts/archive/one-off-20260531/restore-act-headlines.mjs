#!/usr/bin/env node
/**
 * Khôi phục đầy đủ biện pháp can thiệp (Part 4) từ seed gốc,
 * rút gọn mỗi dòng thành đầu mục ngắn + mã ACT, sắp ACT-100→500.
 *
 * Usage: node scripts/restore-act-headlines.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const PART34 = path.join(repoRoot, "supabase/migrations/20260528000005_gstt_part34_all51_seed.sql");
const BACKFILL4 = path.join(
  repoRoot,
  "supabase/migrations/20260528000010_gstt_canonical_36_act_backfill_fix.sql",
);
const CANONICAL = path.join(repoRoot, "docs/data/bang-kiem/canonical-36.md");
const OUT_SQL = path.join(
  repoRoot,
  "supabase/migrations/20260528000013_gstt_act_headlines_shorter.sql",
);

function actOrder(code) {
  return Number(String(code).replace("ACT-", "")) || 999;
}

function toHeadline(raw) {
  let t = String(raw || "")
    .replace(/^\*\s*\[\s*\]\s*/g, "")
    .replace(/\s*\[[\d,\s\\]+\]\s*/g, " ")
    .replace(/\\-/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const colon = t.indexOf(":");
  if (colon > 5 && colon <= 52) {
    return t
      .slice(0, colon)
      .replace(/\s*\(Stop the Line\)\s*$/i, "")
      .replace(/\s*\(Coaching\)\s*$/i, "")
      .trim();
  }

  if (colon > 0) {
    let after = t.slice(colon + 1).trim();
    const stop = after.search(/[.!?(]/);
    if (stop > 8 && stop <= 55) after = after.slice(0, stop).trim();
    const comma = after.indexOf(",");
    if (comma > 8 && comma <= 48) after = after.slice(0, comma).trim();
    if (after.length >= 8 && after.length <= 55) return after;
  }

  const comma = t.indexOf(",");
  if (comma > 8 && comma <= 48) t = t.slice(0, comma).trim();

  t = t.replace(/\s*\(Stop the Line\)\s*$/i, "").replace(/\s*\(Coaching\)\s*$/i, "");

  if (t.length > 48) {
    const cut = t.lastIndexOf(" ", 44);
    t = `${(cut > 16 ? t.slice(0, cut) : t.slice(0, 44)).trim()}…`;
  }
  return t;
}

function loadActionsFromPart34() {
  const sql = readFileSync(PART34, "utf8");
  const map = new Map();
  const re =
    /hanh_dong_khac_phuc_jsonb = \$jsonb\$([\s\S]*?)\$jsonb\$::jsonb[\s\S]*?where bk\.ma_bk = '([^']+)';/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    map.set(m[2], JSON.parse(m[1]));
  }
  return map;
}

function loadActionsFromBackfill4() {
  const sql = readFileSync(BACKFILL4, "utf8");
  const map = new Map();
  const re =
    /hanh_dong_khac_phuc_jsonb = \$jsonb\$([\s\S]*?)\$jsonb\$::jsonb where ma_bk = '([^']+)';/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    map.set(m[2], JSON.parse(m[1]));
  }
  return map;
}

function normalizeActions(raw) {
  const sorted = [...raw].sort(
    (a, b) => actOrder(a.action_code) - actOrder(b.action_code) || (a.stt ?? 0) - (b.stt ?? 0),
  );
  return sorted.map((row, idx) => ({
    stt: idx + 1,
    noi_dung: toHeadline(row.noi_dung),
    action_code: row.action_code || "ACT-200",
    la_stop_the_line: Boolean(row.la_stop_the_line ?? row.action_code === "ACT-400"),
  }));
}

function sqlJsonb(obj) {
  return `$jsonb$${JSON.stringify(obj)}$jsonb$::jsonb`;
}

function patchCanonicalMd(actionMap) {
  let md = readFileSync(CANONICAL, "utf8");
  const re =
    /(```yaml\n)([\s\S]*?)(```\n\n## ([^\n]+)\n\n[\s\S]*?\*\*PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC\*\*\n\n)([\s\S]*?)(\n\*\*Chữ ký)/g;

  md = md.replace(re, (_full, yamlOpen, yaml, p4head, _oldP4, sig) => {
    const ma = _full.match(/## ([^\n]+)/)?.[1]?.trim();
    if (!ma || !actionMap.has(ma)) return _full;
    const actions = actionMap.get(ma);

    let newYaml = yaml
      .split("\n")
      .filter((l) => !/^(act_mac_dinh|hanh_dong_items):/.test(l.trim()))
      .join("\n")
      .trimEnd();
    newYaml += `\nhanh_dong_items:\n`;
    for (const a of actions) {
      newYaml += `  - { code: ${a.action_code}, headline: "${a.noi_dung.replace(/"/g, '\\"')}" }\n`;
    }

    const bullets = actions.map((a) => `* **${a.action_code}** — ${a.noi_dung}`).join("\n");
    const p4 =
      p4head +
      "*(Đầu mục theo mã ACT — tick khi đã can thiệp; chi tiết nghiệp vụ lưu ở seed gốc)*\n\n" +
      bullets +
      "\n";

    return yamlOpen + newYaml + "```\n\n## " + ma + "\n\n" + _full.split("```\n\n## " + ma + "\n\n")[1].split("**PHẦN 4:")[0] + p4 + sig;
  });

  // Simpler approach: replace only Part 4 block per form
  const formRe =
    /<!-- BANG_KIEM_START -->\n```yaml\n([\s\S]*?)```\n\n## ([^\n]+)\n\n([\s\S]*?)\n\n---\n\n<!-- BANG_KIEM_END -->/g;

  md = readFileSync(CANONICAL, "utf8");
  md = md.replace(formRe, (full, yaml, ma, body) => {
    if (!actionMap.has(ma.trim())) return full;
    const actions = actionMap.get(ma.trim());

    const yamlLines = yaml
      .trimEnd()
      .split("\n")
      .filter((l) => !/^(act_mac_dinh|hanh_dong_items):/.test(l.trim()) && !/^\s+- \{ code:/.test(l));
    yamlLines.push("hanh_dong_items:");
    for (const a of actions) {
      yamlLines.push(`  - { code: ${a.action_code}, headline: "${a.noi_dung.replace(/"/g, '\\"')}" }`);
    }

    const p4Idx = body.search(/\*\*PHẦN 4:/i);
    const sigIdx = body.search(/\n\*\*Chữ ký/i);
    if (p4Idx < 0 || sigIdx < 0) return full;

    const head = body.slice(0, p4Idx).trimEnd() + "\n\n";
    const tail = body.slice(sigIdx);
    const bullets = actions.map((a) => `* **${a.action_code}** — ${a.noi_dung}`).join("\n");
    const p4 = [
      "**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**",
      "",
      "*(Đầu mục theo mã ACT — tick khi đã can thiệp)*",
      "",
      bullets,
      "",
    ].join("\n");

    return `<!-- BANG_KIEM_START -->\n\`\`\`yaml\n${yamlLines.join("\n")}\n\`\`\`\n\n## ${ma}\n\n${head}${p4}${tail}\n\n---\n\n<!-- BANG_KIEM_END -->`;
  });

  // Fix intro text about 1 ACT
  md = md.replace(
    /\*\*Quy ước Phần 4:\*\* Mỗi bảng kiểm \*\*một mã ACT\*\*.*\n/,
    "**Quy ước Phần 4:** Nhiều đầu mục can thiệp / bảng kiểm, mỗi dòng gắn **một mã ACT** (đầu mục ngắn, không mô tả dài).\n",
  );
  md = md.replace(
    /> Thứ tự chuẩn \*\*ACT-100 → ACT-500\*\*. Mỗi bảng kiểm gắn \*\*một\*\* mã trong YAML `act_mac_dinh`\./,
    "> Thứ tự hiển thị **ACT-100 → ACT-500**. YAML `hanh_dong_items[]` — mỗi phần tử `{ code, headline }`.",
  );
  md = md.replace(
    /\| Phần 4 hành động \| `phieu_phan_tich_jsonb\.hanh_dong_khac_phuc` \| \*\*1 ACT\*\* từ `hanh_dong_khac_phuc_jsonb` \|/,
    "| Phần 4 hành động | `phieu_phan_tich_jsonb.hanh_dong_khac_phuc` | Nhiều đầu mục từ `hanh_dong_khac_phuc_jsonb` (mỗi dòng 1 ACT) |",
  );

  writeFileSync(CANONICAL, md, "utf8");
}

function main() {
  const part34 = loadActionsFromPart34();
  const backfill = loadActionsFromBackfill4();
  const md = readFileSync(CANONICAL, "utf8");
  const forms = [...md.matchAll(/^ma_bk: (.+)$/gm)].map((m) => m[1].trim());

  const actionMap = new Map();
  const sql = [
    "-- 20260528000013_gstt_act_headlines_shorter.sql",
    "-- Rút gọn đầu mục biện pháp can thiệp (~48 ký tự), giữ đủ số dòng từ seed gốc",
    "begin;",
    "",
  ];

  let total = 0;
  for (const ma of forms) {
    const raw = part34.get(ma) ?? backfill.get(ma);
    if (!raw?.length) {
      console.warn(`WARN: no actions for ${ma}`);
      continue;
    }
    const actions = normalizeActions(raw);
    actionMap.set(ma, actions);
    total += actions.length;
    sql.push(`-- ${ma}: ${actions.length} đầu mục`);
    sql.push(
      `update public.gstt_dm_bang_kiem set hanh_dong_khac_phuc_jsonb = ${sqlJsonb(actions)} where ma_bk = '${ma}';`,
    );
    sql.push("");
    console.log(`${ma}: ${actions.length} items`, actions.map((a) => a.action_code).join(", "));
  }

  sql.push("commit;", "", `-- ${forms.length} forms · ${total} action headlines`);
  writeFileSync(OUT_SQL, sql.join("\n"), "utf8");
  patchCanonicalMd(actionMap);
  console.log(`\nWrote ${OUT_SQL}`);
}

main();
