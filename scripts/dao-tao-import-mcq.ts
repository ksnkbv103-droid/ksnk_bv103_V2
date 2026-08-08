#!/usr/bin/env npx tsx
/**
 * Import ngân hàng MCQ (upsert theo ma_cau).
 *
 *   npx tsx scripts/dao-tao-import-mcq.ts [--local] [--sync-full] [--dry-run] [path.xlsx]
 *
 * Nên Export ngân hàng từ UI `/dao-tao/admin/ngan-hang` rồi sửa file trước khi import.
 * `--replace` vẫn được chấp nhận (map sang --sync-full).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import {
  buildPhuongAnWithStableIds,
  dapAnByNhanToDapAnDung,
  generateMaCau,
  parseMcqRowsFromMatrix,
  type ParsedMcqRow,
} from "../src/lib/dao-tao/parse-mcq-excel";
import { resolveLocalSupabaseEnv } from "./lib/resolve-local-supabase-env.mjs";

function parseEnv(raw: string) {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const eq = text.indexOf("=");
    if (eq < 0) continue;
    out[text.slice(0, eq).trim()] = text.slice(eq + 1).trim();
  }
  return out;
}

function cellToValue(v: ExcelJS.CellValue): unknown {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "object" && "text" in v) return String((v as { text: string }).text ?? "");
  if (typeof v === "object" && "richText" in v) {
    const rt = (v as { richText: Array<{ text: string }> }).richText ?? [];
    return rt.map((t) => t.text).join("");
  }
  if (typeof v === "object" && "result" in v) return (v as { result: unknown }).result ?? "";
  return String(v);
}

const DEFAULT_CHU_DE = {
  ma: "SSI_TRUOC_MO",
  ten: "Phòng ngừa nhiễm khuẩn vết mổ (trước mổ)",
};

type DbRow = {
  id: string;
  ma_cau: string;
  chu_de_ma: string;
  is_active: boolean;
  phuong_an: Array<{ id: string; nhan_goc: string }> | null;
};

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const useLocal = process.argv.includes("--local");
  const syncFull =
    process.argv.includes("--sync-full") || process.argv.includes("--replace");
  const dryRun = process.argv.includes("--dry-run");
  const defaultPath = join(process.env.HOME || "", "Downloads", "MCQ to form_2.xlsx");
  const xlsxPath = args[0] || defaultPath;
  if (!existsSync(xlsxPath)) {
    console.error(`[dao-tao:import] Không tìm thấy file: ${xlsxPath}`);
    process.exit(1);
  }

  const env = parseEnv(readFileSync(join(process.cwd(), ".env.local"), "utf8"));
  let url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  let serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (useLocal) {
    const local = await resolveLocalSupabaseEnv();
    url = local.url;
    serviceKey = local.serviceKey;
  }
  if (!url || !serviceKey) {
    console.error("[dao-tao:import] Thiếu URL hoặc SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  console.log(
    `[dao-tao:import] Đọc ${xlsxPath} → ${useLocal ? "local" : "cloud"} (upsert ma_cau${syncFull ? ", sync-full" : ""}${dryRun ? ", dry-run" : ""})`,
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];
  if (!ws) {
    console.error("[dao-tao:import] File không có sheet");
    process.exit(1);
  }

  const matrix: unknown[][] = [];
  ws.eachRow((row) => {
    const vals: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      vals[col - 1] = cellToValue(cell.value);
    });
    matrix.push(vals);
  });

  const parsed = parseMcqRowsFromMatrix(matrix);
  console.log(
    `[dao-tao:import] Parse: ${parsed.questions.length} câu, layout=${parsed.layout}, skipped=${parsed.skipped}, errors=${parsed.errors.length}`,
  );
  if (!parsed.questions.length) process.exit(1);

  const { data: existing, error: exErr } = await sb
    .from("dao_tao_cau_hoi")
    .select("id, ma_cau, chu_de_ma, is_active, phuong_an")
    .limit(10000);
  if (exErr) throw exErr;
  const byMa = new Map<string, DbRow>();
  for (const r of (existing ?? []) as DbRow[]) byMa.set(r.ma_cau, r);

  const used = new Set<string>();
  const prepared: Array<{
    maCau: string;
    chuDeMa: string;
    chuDeTen: string;
    row: ParsedMcqRow;
    existing?: DbRow;
  }> = [];

  for (const row of parsed.questions) {
    const chuDeMa = row.chuDeMa?.trim() || DEFAULT_CHU_DE.ma;
    const chuDeTen = row.chuDeTen?.trim() || DEFAULT_CHU_DE.ten;
    let maCau = row.maCau?.trim() || generateMaCau(chuDeMa, row.stt);
    if (used.has(maCau)) {
      let i = 2;
      while (used.has(`${maCau}-${i}`)) i += 1;
      maCau = `${maCau}-${i}`;
    }
    used.add(maCau);
    prepared.push({
      maCau,
      chuDeMa,
      chuDeTen,
      row,
      existing: byMa.get(maCau),
    });
  }

  const insertCount = prepared.filter((p) => !p.existing).length;
  const updateCount = prepared.filter((p) => p.existing).length;
  const fileMas = new Set(prepared.map((p) => p.maCau));
  const chuDeInFile = new Set(prepared.map((p) => p.chuDeMa));
  const toDeactivate = ((existing ?? []) as DbRow[]).filter(
    (r) => r.is_active && chuDeInFile.has(r.chu_de_ma) && !fileMas.has(r.ma_cau),
  );

  console.log(
    `[dao-tao:import] Audit: insert=${insertCount}, update=${updateCount}, deactivate_if_sync=${toDeactivate.length}`,
  );
  if (dryRun) {
    console.log("[dao-tao:import] Dry-run — không ghi DB");
    process.exit(0);
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const p of prepared) {
    const phuongAn = buildPhuongAnWithStableIds(
      p.row.options,
      p.existing?.phuong_an,
      () => randomUUID(),
    );
    const nhanToId: Record<string, string> = {};
    for (const o of phuongAn) nhanToId[o.nhan_goc] = o.id;
    const payload = {
      ma_cau: p.maCau,
      chu_de_ma: p.chuDeMa,
      chu_de_ten: p.chuDeTen,
      loai: p.row.loai,
      bloom_level: p.row.bloomLevel,
      stem: p.row.stem,
      giai_thich: p.row.giaiThich || null,
      phuong_an: phuongAn,
      dap_an_dung: dapAnByNhanToDapAnDung(p.row.dapAnByNhan, nhanToId),
      import_stt: p.row.stt,
      is_active: p.row.isActive,
      updated_at: now,
    };
    if (p.existing) {
      const { error } = await sb.from("dao_tao_cau_hoi").update(payload).eq("id", p.existing.id);
      if (error) {
        failed += 1;
        console.warn(`\n update ${p.maCau}:`, error.message);
      } else updated += 1;
    } else {
      const { error } = await sb.from("dao_tao_cau_hoi").insert({
        ...payload,
        created_at: now,
      });
      if (error) {
        failed += 1;
        console.warn(`\n insert ${p.maCau}:`, error.message);
      } else inserted += 1;
    }
    if ((inserted + updated + failed) % 40 === 0) {
      process.stdout.write(
        `\r[dao-tao:import] progress insert=${inserted} update=${updated} fail=${failed}`,
      );
    }
  }

  let deactivated = 0;
  if (syncFull && toDeactivate.length) {
    const ids = toDeactivate.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await sb
        .from("dao_tao_cau_hoi")
        .update({ is_active: false, updated_at: now })
        .in("id", chunk);
      if (error) console.warn("\n deactivate:", error.message);
      else deactivated += chunk.length;
    }
  }

  console.log(
    `\n[dao-tao:import] Xong: inserted=${inserted}, updated=${updated}, deactivated=${deactivated}, failed=${failed}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
