#!/usr/bin/env node
/**
 * Cutover DB: wipe master + fact giám sát, seed đúng 36 bảng kiểm chuẩn (BANG_KIEM_CHUAN_4_PHAN.md).
 *
 * Usage: node scripts/generate-canonical-36-cutover.mjs
 * Output: supabase/migrations/20260528000008_gstt_canonical_36_cutover.sql
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CANONICAL_MD = path.join(repoRoot, "docs/data/bang-kiem/canonical-36.md");
const V51_SQL = path.join(repoRoot, "supabase/migrations/20260527000013_seed_master_checklist_v51.sql");
const PART34_SQL = path.join(repoRoot, "supabase/migrations/20260528000005_gstt_part34_all51_seed.sql");
const OUT_SQL = path.join(repoRoot, "supabase/migrations/20260528000008_gstt_canonical_36_cutover.sql");

const DOMAIN_TO_PHAN_LOAI = {
  "Thực hành chuẩn": "PHONG_NGUA_CHUAN",
  "Gói can thiệp lâm sàng": "GOI_CAN_THIEP",
  "Tái xử lý dụng cụ": "XU_LY_DUNG_CU",
  "Môi trường & Hạ tầng": "MOI_TRUONG_CHAT_THAI",
};

function stripMd(s) {
  return String(s || "")
    .replace(/\\([_\\[\]()])/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlJsonb(obj) {
  return `$jsonb$${JSON.stringify(obj)}$jsonb$::jsonb`;
}

function extractV51InsertBlocks() {
  const sql = readFileSync(V51_SQL, "utf8");
  const map = new Map();
  const re =
    /-- Template #\d+ (BM\.[^\s—]+)[\s\S]*?\ninsert into public\.gstt_dm_bang_kiem[\s\S]*?\n\);\n/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const ma = m[1].trim();
    map.set(ma, m[0]);
  }
  return map;
}

function loadPart34FromSeed() {
  const sql = readFileSync(PART34_SQL, "utf8");
  const map = new Map();
  const re =
    /-- (BM\.[^\n:]+)[\s\S]*?update public\.gstt_dm_bang_kiem bk set([\s\S]*?)where bk\.ma_bk = '([^']+)';/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const body = m[2];
    const ma = m[3].trim();
    const hanhM = body.match(/hanh_dong_khac_phuc_jsonb = \$jsonb\$([\s\S]*?)\$jsonb\$::jsonb/);
    const nguyenEntriesM = body.match(
      /jsonb_array_elements\(\$jsonb\$([\s\S]*?)\$jsonb\$::jsonb\)\s+e/,
    );
    map.set(ma, {
      hanh_dong: hanhM ? JSON.parse(hanhM[1]) : [],
      nguyen_nhan_entries: nguyenEntriesM ? JSON.parse(nguyenEntriesM[1]) : [],
    });
  }
  return map;
}

function parseCanonicalForms() {
  const md = readFileSync(CANONICAL_MD, "utf8");
  const forms = [];
  const re =
    /<!-- BANG_KIEM_START -->\n```yaml\n([\s\S]*?)```\n\n## ([^\n]+)\n\n([\s\S]*?)\n\n---\n\n<!-- BANG_KIEM_END -->/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    const yaml = m[1];
    const ma_bk = m[2].trim();
    const body = m[3];
    const meta = {};
    for (const line of yaml.split("\n")) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (!kv) continue;
      meta[kv[1]] = kv[2].replace(/^"|"$/g, "");
    }
    forms.push({ ma_bk, meta, body });
  }
  return forms;
}

function parsePart2Criteria(body) {
  const p2split = body.split(/\*\*PHẦN 2:/i);
  if (p2split.length < 2) return [];
  const p2 = p2split[1].split(/\*\*PHẦN 3/i)[0];
  const criteria = [];
  let phan_muc = "Chỉ định";
  for (const line of p2.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 3) continue;
    const firstCell = cells[1] ?? "";
    const header = firstCell.match(/^\*\*([A-Z0-9.\s]+)\*\*$/);
    if (header) {
      phan_muc = stripMd(header[1]);
      continue;
    }
    const row = firstCell.match(/^(\d+)\\?\.\s*(.+)$/);
    if (!row) continue;
    const stt = Number(row[1]);
    let noi_dung = stripMd(row[2]);
    noi_dung = noi_dung.replace(/^\*\s*/, "").trim();
    criteria.push({
      id: randomUUID(),
      ma_tc: String(9000 + stt),
      stt,
      noi_dung,
      ghi_chu: null,
      is_active: true,
      diem_toi_da: 1,
      phan_muc,
      kieu_du_lieu: "BOOLEAN",
      la_then_chot: /bắt buộc|stop the line|tuyệt đối/i.test(noi_dung),
      cho_phep_kpa: false,
      cac_lua_chon: null,
      ma_csv_goc: null,
    });
  }
  return criteria;
}

function parsePart34FromBody(body, part34Seed) {
  const p3 = body.split(/PHẦN 3:/i)[1]?.split(/PHẦN 4:/i)[0] || "";
  const p4 = body.split(/PHẦN 4:/i)[1]?.split(/\n\*\*Chữ ký/i)[0] || "";

  const reasons = [];
  for (const line of p3.split("\n")) {
    const cleaned = stripMd(line);
    const rm = cleaned.match(/\[(\d{3})-(SYS|HUM|CLI)\]/i);
    if (!rm) continue;
    const code = `${rm[1]}_${rm[2].toUpperCase()}`;
    let text = cleaned.replace(/^\[\s*\]?\s*\]?\s*/i, "");
    text = text.replace(/\[(\d{3})-(SYS|HUM|CLI)\]/gi, "").trim();
    const colon = text.indexOf(":");
    reasons.push({
      lookup_code: code,
      ten_hien_thi: colon >= 0 ? text.slice(0, colon).trim() : text,
      mo_ta_chi_tiet: colon >= 0 ? text.slice(colon + 1).trim() : text,
    });
  }

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

  if (actions.length === 0 && part34Seed?.hanh_dong?.length) {
    return { reasons, actions: part34Seed.hanh_dong, fromSeed: true };
  }
  return { reasons, actions, fromSeed: false };
}

function inferMetadata(meta, ma_bk) {
  const domain = meta.ten_catalog || "";
  let phan_loai = "PHONG_NGUA_CHUAN";
  for (const [k, v] of Object.entries(DOMAIN_TO_PHAN_LOAI)) {
    if (domain.includes(k) || (meta.domain || "").includes(k)) {
      phan_loai = v;
      break;
    }
  }
  let loai_giam_sat = "TUAN_THU";
  let doi_tuong = "NHAN_VIEN";
  let cach_tinh = "DAT_KHONG_DAT";
  if (/NHAT_KY|VẬN HÀNH LÒ|LOG/i.test(meta.ten_trong_form || "")) {
    loai_giam_sat = "NHAT_KY_VAN_HANH";
    doi_tuong = "THIET_BI";
    cach_tinh = "NHAT_KY";
  }
  if (/ME TIẾT|BATCH/i.test(ma_bk)) {
    doi_tuong = "ME_TIET_KHUAN";
  }
  if (/NGƯỜI BỆNH|PATIENT|VẾT MỔ|CLABSI|CAUTI|VAP/i.test(meta.ten_trong_form || "")) {
    doi_tuong = "NGUOI_BENH";
  }
  if (phan_loai === "GOI_CAN_THIEP") cach_tinh = "TRON_GOI";
  return { phan_loai, loai_giam_sat, doi_tuong, cach_tinh };
}

function buildInsertFromCanonical(form, part34Seed) {
  const criteria = parsePart2Criteria(form.body);
  if (criteria.length === 0) {
    throw new Error(`${form.ma_bk}: không parse được Phần 2 — cần bổ tay`);
  }
  const meta = inferMetadata(form.meta, form.ma_bk);
  const { reasons, actions } = parsePart34FromBody(form.body, part34Seed);

  const lines = [];
  lines.push(`-- ${form.ma_bk}: ${form.meta.ten_trong_form?.slice(0, 72) || ""}`);
  lines.push("insert into public.gstt_dm_bang_kiem (");
  lines.push(
    "  ma_bk, ten_bang_kiem, nhom_chuyen_de, mo_ta, is_active, is_system,",
  );
  lines.push(
    "  loai_hinh_giam_sat, tieu_chi_jsonb, phan_loai_chuyen_mon,",
  );
  lines.push(
    "  loai_giam_sat, doi_tuong_giam_sat, cach_tinh_diem, phien_ban,",
  );
  lines.push(
    "  hanh_dong_khac_phuc_jsonb, nguyen_nhan_cho_phep_jsonb",
  );
  lines.push(") values (");
  lines.push(`  ${sqlStr(form.ma_bk)},`);
  lines.push(`  ${sqlStr(form.meta.ten_trong_form || form.ma_bk)},`);
  lines.push(`  'STANDARD_PRECAUTION',`);
  lines.push(`  NULL,`);
  lines.push(`  true,`);
  lines.push(`  true,`);
  lines.push(`  'TRUC_TIEP',`);
  lines.push(`  ${sqlJsonb(criteria)},`);
  lines.push(`  ${sqlStr(meta.phan_loai)},`);
  lines.push(`  ${sqlStr(meta.loai_giam_sat)},`);
  lines.push(`  ${sqlStr(meta.doi_tuong)},`);
  lines.push(`  ${sqlStr(meta.cach_tinh)},`);
  lines.push(`  '2.0',`);
  lines.push(`  ${sqlJsonb(actions)},`);
  lines.push(`  '[]'::jsonb`); // allowlist resolve ở block sau
  lines.push(");");
  lines.push("");

  const allowlistUpdate = [];
  if (reasons.length > 0) {
    const entries = reasons.map((r, i) => ({
      lookup_code: r.lookup_code,
      ten_hien_thi: r.ten_hien_thi,
      mo_ta_chi_tiet: r.mo_ta_chi_tiet,
      thu_tu_hien_thi: i + 1,
    }));
    allowlistUpdate.push(buildAllowlistUpdate(form.ma_bk, entries));
  }

  return { insert: lines.join("\n"), allowlistUpdate, criteriaCount: criteria.length, actionCount: actions.length };
}

function buildAllowlistUpdate(ma_bk, entries) {
  const lines = [];
  lines.push(`-- allowlist ${ma_bk}`);
  lines.push(`update public.gstt_dm_bang_kiem bk set`);
  lines.push(`  nguyen_nhan_cho_phep_jsonb = coalesce(`);
  lines.push(`    (select jsonb_agg(`);
  lines.push(`      jsonb_build_object(`);
  lines.push(`        'lookup_id', l.id::text,`);
  lines.push(`        'lookup_code', l.code,`);
  lines.push(`        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),`);
  lines.push(`        'mo_ta_chi_tiet', coalesce(e->>'mo_ta_chi_tiet', l.description),`);
  lines.push(`        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int`);
  lines.push(`      ) order by (e->>'thu_tu_hien_thi')::int`);
  lines.push(`    ) from jsonb_array_elements(${sqlJsonb(entries)}) e`);
  lines.push(`    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),`);
  lines.push(`    '[]'::jsonb)`);
  lines.push(`where bk.ma_bk = ${sqlStr(ma_bk)};`);
  lines.push("");
  return lines.join("\n");
}

function patchV51Insert(insertBlock, form, part34) {
  const lines = [];
  lines.push(`-- ${form.ma_bk} (v51 tiêu chí + part34 canonical)`);
  lines.push(insertBlock.replace(/'1\.0'\s*\)/, "'2.0')"));
  lines.push("");
  if (part34?.hanh_dong?.length) {
    lines.push(`update public.gstt_dm_bang_kiem bk set`);
    lines.push(`  hanh_dong_khac_phuc_jsonb = ${sqlJsonb(part34.hanh_dong)}`);
    lines.push(`where bk.ma_bk = ${sqlStr(form.ma_bk)};`);
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const forms = parseCanonicalForms();
  const v51 = extractV51InsertBlocks();
  const part34Map = loadPart34FromSeed();

  const out = [];
  out.push("-- 20260528000008_gstt_canonical_36_cutover.sql");
  out.push("-- Cutover: xóa toàn bộ master bảng kiểm cũ (51) + history; seed 36 bảng kiểm chuẩn.");
  out.push(`-- Nguồn: docs/data/bang-kiem/canonical-36.md (${forms.length} mẫu)`);
  out.push("-- Generated by scripts/generate-canonical-36-cutover.mjs");
  out.push("");
  out.push("begin;");
  out.push("");

  out.push("-- 1) Wipe fact giám sát (nền sạch pilot; RCA đã DROP ở 20260528000001)");
  out.push(`truncate table
  public.gstt_fact_vst,
  public.gstt_fact_vst_sessions,
  public.gstt_fact_vst_moments_summary,
  public.gstt_fact_vst_opportunities_summary,
  public.gstt_fact_vst_sessions_summary
restart identity cascade;`);
  out.push(`truncate table
  public.gstt_fact_chung_sessions,
  public.gstt_fact_gsc_dashboard_summary,
  public.gstt_fact_gsc_violations_summary
restart identity cascade;`);
  out.push("");

  out.push("-- 2) Xóa toàn bộ master bảng kiểm cũ");
  out.push("delete from public.gstt_dm_bang_kiem;");
  out.push("");

  out.push("-- 3) Seed 36 bảng kiểm chuẩn");
  let totalCriteria = 0;
  let totalAct = 0;
  const allowlistBlocks = [];

  for (const form of forms) {
    const part34 = part34Map.get(form.ma_bk);
    const v51Block = v51.get(form.ma_bk);

    if (v51Block) {
      out.push(patchV51Insert(v51Block, form, part34));
      const built = parsePart34FromBody(form.body, part34);
      if (built.reasons.length > 0) {
        allowlistBlocks.push(
          buildAllowlistUpdate(
            form.ma_bk,
            built.reasons.map((r, i) => ({
              lookup_code: r.lookup_code,
              ten_hien_thi: r.ten_hien_thi,
              mo_ta_chi_tiet: r.mo_ta_chi_tiet,
              thu_tu_hien_thi: i + 1,
            })),
          ),
        );
      } else if (part34?.nguyen_nhan_entries?.length) {
        allowlistBlocks.push(
          buildAllowlistUpdate(form.ma_bk, part34.nguyen_nhan_entries),
        );
      }
      totalAct += part34?.hanh_dong?.length ?? 0;
    } else {
      const built = buildInsertFromCanonical(form, part34);
      out.push(built.insert);
      if (built.allowlistUpdate) allowlistBlocks.push(built.allowlistUpdate);
      totalCriteria += built.criteriaCount;
      totalAct += built.actionCount;
    }
  }

  out.push("-- 4) Resolve nguyên_nhan allowlist → lookup_id");
  out.push(...allowlistBlocks);

  out.push("notify pgrst, 'reload schema';");
  out.push("");
  out.push("commit;");
  out.push("");
  out.push(`-- Summary: ${forms.length} templates · ~${totalCriteria} tiêu chí parsed · ${totalAct} hành động ACT`);

  writeFileSync(OUT_SQL, out.join("\n"), "utf8");
  console.log(`Wrote ${OUT_SQL} (${forms.length} forms)`);
}

main();
