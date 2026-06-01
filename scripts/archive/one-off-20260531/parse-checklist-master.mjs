#!/usr/bin/env node
// Parse 3 markdown source files (BANGKIEM.md, TIEUCHI.md, NGUYENNHANLOI.md)
// and generate Supabase migration with INSERT statements.
//
// Usage: node scripts/parse-checklist-master.mjs
// Output: supabase/migrations/20260527000013_seed_master_checklist_v51.sql

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const SRC_TEMPLATE = path.join(repoRoot, 'docs/data/bang-kiem/master-bangkiem.md');
const SRC_CRITERIA = path.join(repoRoot, 'docs/data/bang-kiem/master-tieuchi.md');
const OUT_MIGRATION = path.join(
  repoRoot,
  'supabase/migrations/20260527000013_seed_master_checklist_v51.sql',
);

// --- Mapping helpers ----------------------------------------------------

const SUPER_CATEGORY_MAP = {
  COMPLIANCE_AUDIT: 'TUAN_THU',
  OPERATIONAL_LOG: 'NHAT_KY_VAN_HANH',
  SYSTEM_AUDIT: 'DANH_GIA_HE_THONG',
};

const CATEGORY_MAP = {
  STANDARD_PRECAUTION: 'PHONG_NGUA_CHUAN',
  CARE_BUNDLE: 'GOI_CAN_THIEP',
  CSSD: 'XU_LY_DUNG_CU',
  ENVIRONMENTAL_WASTE: 'MOI_TRUONG_CHAT_THAI',
  SPECIALTY_SURVEILLANCE: 'CHUYEN_KHOA',
  SYSTEM_MANAGEMENT: 'QUAN_TRI_HE_THONG',
};

const TARGET_MAP = {
  STAFF: 'NHAN_VIEN',
  PATIENT: 'NGUOI_BENH',
  ENVIRONMENT: 'MOI_TRUONG',
  EQUIPMENT: 'THIET_BI',
  BATCH: 'ME_TIET_KHUAN',
};

const SCORING_MAP = {
  PERCENTAGE: 'TY_LE',
  PASS_FAIL: 'DAT_KHONG_DAT',
  ALL_OR_NONE: 'TRON_GOI',
  LOG_ENTRY: 'NHAT_KY',
};

// --- Markdown unescape --------------------------------------------------
// Source markdown wraps unsafe MD chars with backslash escapes.
// We strip them so the underlying CSV / Vietnamese text is preserved.
function stripMarkdownEscapes(text) {
  return text.replace(/\\([_<>()\\\-\\+])/g, '$1');
}

// --- CSV parser ---------------------------------------------------------
// Handle quoted strings (with internal commas) and unquoted fields.
function parseCsvLine(line) {
  const out = [];
  let i = 0;
  let cur = '';
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        cur += ch;
        i += 1;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
        i += 1;
      } else if (ch === '"' && cur === '') {
        inQuotes = true;
        i += 1;
      } else {
        cur += ch;
        i += 1;
      }
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function readCsvBlock(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    let line = lines[idx];
    if (!line || !line.trim()) continue;
    line = stripMarkdownEscapes(line);
    rows.push(parseCsvLine(line));
  }
  return rows;
}

// --- Parse BANGKIEM.md --------------------------------------------------
function parseTemplates() {
  const rows = readCsvBlock(SRC_TEMPLATE);
  // Skip header
  const header = rows.shift();
  if (header[0] !== 'Template_ID') {
    throw new Error(`Unexpected BANGKIEM header: ${header.join('|')}`);
  }
  return rows.map((row) => {
    const [
      tplId,
      code,
      name,
      superCategory,
      categoryCode,
      targetType,
      scoringLogic,
      isActiveRaw,
    ] = row;
    return {
      tplId: Number(tplId),
      code,
      name,
      superCategory,
      categoryCode,
      targetType,
      scoringLogic,
      isActive: String(isActiveRaw).toUpperCase() === 'TRUE',
    };
  });
}

// --- Parse TIEUCHI.md ---------------------------------------------------
function parseCriteria() {
  const rows = readCsvBlock(SRC_CRITERIA);
  const header = rows.shift();
  if (header[0] !== 'Item_ID') {
    throw new Error(`Unexpected TIEUCHI header: ${header.join('|')}`);
  }
  // Group by Template_Code
  const byTemplate = new Map();
  for (const row of rows) {
    const [
      itemId,
      templateCode,
      sectionName,
      itemText,
      dataType,
      isCriticalRaw,
      allowNaRaw,
      orderRaw,
    ] = row;
    if (!templateCode) {
      throw new Error(`Empty template_code at row: ${row.join('|')}`);
    }
    if (!byTemplate.has(templateCode)) byTemplate.set(templateCode, []);
    byTemplate.get(templateCode).push({
      ma_csv_goc: itemId,
      ma_tc: itemId,
      phan_muc: sectionName || null,
      noi_dung: itemText,
      kieu_du_lieu: dataType || 'BOOLEAN',
      la_then_chot: String(isCriticalRaw).toUpperCase() === 'TRUE',
      cho_phep_kpa: String(allowNaRaw).toUpperCase() === 'TRUE',
      stt: Number(orderRaw),
    });
  }
  // Sort each by stt
  for (const arr of byTemplate.values()) {
    arr.sort((a, b) => a.stt - b.stt);
  }
  return byTemplate;
}

// --- SQL escapes --------------------------------------------------------
function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBool(value) {
  return value ? 'true' : 'false';
}

function sqlJsonb(value) {
  // Use $jsonb$...$jsonb$ dollar-quoted to avoid quote nightmares.
  const str = JSON.stringify(value);
  return `$jsonb$${str}$jsonb$::jsonb`;
}

// --- Main ---------------------------------------------------------------
function main() {
  const templates = parseTemplates();
  const criteriaByTemplate = parseCriteria();

  // Validation: every criteria template_code exists in templates
  const codeSet = new Set(templates.map((t) => t.code));
  const orphan = [];
  for (const code of criteriaByTemplate.keys()) {
    if (!codeSet.has(code)) orphan.push(code);
  }
  if (orphan.length) {
    throw new Error(`Criteria reference unknown template_code: ${orphan.join(', ')}`);
  }

  // Validation: every category/super_category/target/scoring is in our maps
  for (const t of templates) {
    if (!SUPER_CATEGORY_MAP[t.superCategory]) {
      throw new Error(`Unknown Super_Category=${t.superCategory} for ${t.code}`);
    }
    if (!CATEGORY_MAP[t.categoryCode]) {
      throw new Error(`Unknown Category_Code=${t.categoryCode} for ${t.code}`);
    }
    if (!TARGET_MAP[t.targetType]) {
      throw new Error(`Unknown Target_Type=${t.targetType} for ${t.code}`);
    }
    if (!SCORING_MAP[t.scoringLogic]) {
      throw new Error(`Unknown Scoring_Logic=${t.scoringLogic} for ${t.code}`);
    }
  }

  // Build SQL
  const lines = [];
  lines.push('-- 20260527000013_seed_master_checklist_v51.sql');
  lines.push('-- Auto-generated by scripts/parse-checklist-master.mjs');
  lines.push(
    `-- Source: docs/data/bang-kiem/master-bangkiem.md (${templates.length} templates), docs/data/bang-kiem/master-tieuchi.md`,
  );
  lines.push('-- DO NOT EDIT BY HAND — re-run the parser to regenerate.');
  lines.push('');
  lines.push('begin;');
  lines.push('');
  lines.push("-- 1. Extend phan_loai_chuyen_mon CHECK to allow 'QUAN_TRI_HE_THONG'");
  lines.push('alter table public.gstt_dm_bang_kiem');
  lines.push('  drop constraint if exists chk_gstt_bk_phan_loai_chuyen_mon;');
  lines.push('alter table public.gstt_dm_bang_kiem');
  lines.push('  add constraint chk_gstt_bk_phan_loai_chuyen_mon');
  lines.push('  check (phan_loai_chuyen_mon is null or phan_loai_chuyen_mon = any (array[');
  lines.push("    'PHONG_NGUA_CHUAN','GOI_CAN_THIEP','XU_LY_DUNG_CU',");
  lines.push("    'MOI_TRUONG_CHAT_THAI','CHUYEN_KHOA','QUAN_TRI_HE_THONG'");
  lines.push('  ]));');
  lines.push('');
  lines.push('-- 2. Insert 51 master templates with embedded tieu_chi_jsonb');
  lines.push('-- Note: gstt_dm_bang_kiem was wiped by 20260527000012, so plain INSERT is safe.');
  lines.push('');

  let totalCriteria = 0;
  for (const t of templates) {
    const criteria = criteriaByTemplate.get(t.code) || [];
    totalCriteria += criteria.length;
    const enriched = criteria.map((c) => ({
      id: randomUUID(),
      ma_tc: c.ma_tc,
      stt: c.stt,
      noi_dung: c.noi_dung,
      ghi_chu: null,
      is_active: true,
      diem_toi_da: 1,
      phan_muc: c.phan_muc,
      kieu_du_lieu: c.kieu_du_lieu,
      la_then_chot: c.la_then_chot,
      cho_phep_kpa: c.cho_phep_kpa,
      cac_lua_chon: null,
      ma_csv_goc: c.ma_csv_goc,
    }));

    lines.push(
      `-- Template #${t.tplId} ${t.code} — ${criteria.length} tiêu chí`,
    );
    lines.push('insert into public.gstt_dm_bang_kiem (');
    lines.push(
      '  ma_bk, ten_bang_kiem, nhom_chuyen_de, mo_ta, is_active, is_system,',
    );
    lines.push(
      '  loai_hinh_giam_sat, tieu_chi_jsonb, phan_loai_chuyen_mon,',
    );
    lines.push(
      '  loai_giam_sat, doi_tuong_giam_sat, cach_tinh_diem, phien_ban',
    );
    lines.push(') values (');
    lines.push(`  ${sqlString(t.code)},`);
    lines.push(`  ${sqlString(t.name)},`);
    lines.push(`  ${sqlString(t.categoryCode)},`);
    lines.push(`  NULL,`);
    lines.push(`  ${sqlBool(t.isActive)},`);
    lines.push(`  true,`);
    lines.push(`  'TRUC_TIEP',`);
    lines.push(`  ${sqlJsonb(enriched)},`);
    lines.push(`  ${sqlString(CATEGORY_MAP[t.categoryCode])},`);
    lines.push(`  ${sqlString(SUPER_CATEGORY_MAP[t.superCategory])},`);
    lines.push(`  ${sqlString(TARGET_MAP[t.targetType])},`);
    lines.push(`  ${sqlString(SCORING_MAP[t.scoringLogic])},`);
    lines.push(`  '1.0'`);
    lines.push(');');
    lines.push('');
  }

  lines.push('-- 3. Reload PostgREST schema cache so the API gateway sees fresh rows');
  lines.push("notify pgrst, 'reload schema';");
  lines.push('');
  lines.push('commit;');
  lines.push('');
  lines.push('-- ============================================================================');
  lines.push(`-- Summary: ${templates.length} templates · ${totalCriteria} tiêu chí`);
  lines.push('-- ============================================================================');
  lines.push('');

  writeFileSync(OUT_MIGRATION, lines.join('\n'));

  console.log(`✔ Wrote migration: ${path.relative(repoRoot, OUT_MIGRATION)}`);
  console.log(`  Templates: ${templates.length}`);
  console.log(`  Tieu chí : ${totalCriteria}`);

  // Cross-tab: count templates by super_category and category
  const byScope = {};
  const byCat = {};
  for (const t of templates) {
    byScope[t.superCategory] = (byScope[t.superCategory] || 0) + 1;
    byCat[t.categoryCode] = (byCat[t.categoryCode] || 0) + 1;
  }
  console.log('  By super_category:', byScope);
  console.log('  By category_code :', byCat);
}

main();
