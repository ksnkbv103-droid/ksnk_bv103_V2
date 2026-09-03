"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import type { BloomLevel, DaoTaoQuestionLoai, DapAnDung } from "@/lib/dao-tao/types";
import {
  buildPhuongAnWithStableIds,
  dapAnByNhanToDapAnDung,
  dapAnDungToByNhan,
  generateMaCau,
  parseMcqRowsFromMatrix,
  type ExportBankRow,
  type ParsedMcqRow,
} from "@/lib/dao-tao/parse-mcq-excel";
import { requireDaoTaoUser } from "@/modules/dao-tao/lib/dao-tao-auth";
import { randomUUID } from "crypto";

const DEFAULT_CHU_DE = {
  ma: "SSI_TRUOC_MO",
  ten: "Phòng ngừa nhiễm khuẩn vết mổ (trước mổ)",
} as const;

type PhuongAnJson = {
  id: string;
  nhan_goc: string;
  noi_dung: string;
  thu_tu_goc: number;
  tf_dung?: boolean | null;
};

type DbCauHoi = {
  id: string;
  ma_cau: string;
  chu_de_ma: string;
  chu_de_ten: string;
  loai: string;
  bloom_level: number;
  stem: string;
  giai_thich: string | null;
  is_active: boolean;
  import_stt: number | null;
  phuong_an: PhuongAnJson[] | null;
  dap_an_dung: DapAnDung;
};

function resolveChuDe(row: ParsedMcqRow, fallbackMa: string, fallbackTen: string) {
  return {
    ma: row.chuDeMa?.trim() || fallbackMa,
    ten: row.chuDeTen?.trim() || fallbackTen,
  };
}

function resolveMaCau(row: ParsedMcqRow, chuDeMa: string, used: Set<string>): string {
  let ma = row.maCau?.trim() || generateMaCau(chuDeMa, row.stt);
  if (!used.has(ma)) {
    used.add(ma);
    return ma;
  }
  // Trùng trong file: thêm hậu tố.
  let i = 2;
  while (used.has(`${ma}-${i}`)) i += 1;
  ma = `${ma}-${i}`;
  used.add(ma);
  return ma;
}

function rowToPayload(row: ParsedMcqRow, maCau: string, chuDeMa: string, chuDeTen: string, existing?: DbCauHoi) {
  const phuongAn = buildPhuongAnWithStableIds(row.options, existing?.phuong_an, () => randomUUID());
  const nhanToId: Record<string, string> = {};
  for (const o of phuongAn) nhanToId[o.nhan_goc] = o.id;
  return {
    ma_cau: maCau,
    chu_de_ma: chuDeMa,
    chu_de_ten: chuDeTen,
    loai: row.loai,
    bloom_level: row.bloomLevel,
    stem: row.stem,
    giai_thich: row.giaiThich || null,
    phuong_an: phuongAn,
    dap_an_dung: dapAnByNhanToDapAnDung(row.dapAnByNhan, nhanToId),
    import_stt: row.stt,
    is_active: row.isActive,
    updated_at: new Date().toISOString(),
  };
}

export async function listChuDeDaoTao() {
  await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hoi")
    .select("chu_de_ma, chu_de_ten")
    .eq("is_active", true);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.chu_de_ma) map.set(row.chu_de_ma, row.chu_de_ten ?? row.chu_de_ma);
  }
  if (map.size === 0) {
    map.set(DEFAULT_CHU_DE.ma, DEFAULT_CHU_DE.ten);
  }
  return [...map.entries()].map(([ma, ten]) => ({ id: ma, ma, ten, is_active: true }));
}

export async function listCauHoiDaoTao(filters?: {
  chuDeMa?: string;
  loai?: string;
  limit?: number;
  includeInactive?: boolean;
}) {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  let q = admin
    .from("dao_tao_cau_hoi")
    .select(
      "id, ma_cau, chu_de_ma, chu_de_ten, loai, bloom_level, stem, giai_thich, is_active, import_stt, created_at, phuong_an, dap_an_dung",
    )
    .order("import_stt", { ascending: true, nullsFirst: false })
    .limit(filters?.limit ?? 500);
  if (!filters?.includeInactive) q = q.eq("is_active", true);
  if (filters?.chuDeMa) q = q.eq("chu_de_ma", filters.chuDeMa);
  if (filters?.loai) q = q.eq("loai", filters.loai);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getBankStats() {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hoi")
    .select("loai")
    .eq("is_active", true);
  if (error) throw error;
  const byLoai: Record<string, number> = {};
  for (const row of data ?? []) {
    byLoai[row.loai] = (byLoai[row.loai] ?? 0) + 1;
  }
  return { total: data?.length ?? 0, byLoai };
}

export async function getDaoTaoBankForExport(includeInactive = true): Promise<ExportBankRow[]> {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  let q = admin
    .from("dao_tao_cau_hoi")
    .select(
      "ma_cau, chu_de_ma, chu_de_ten, import_stt, loai, stem, giai_thich, is_active, bloom_level, phuong_an, dap_an_dung",
    )
    .order("import_stt", { ascending: true, nullsFirst: false })
    .limit(5000);
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;

  const out: ExportBankRow[] = [];
  for (const row of data ?? []) {
    const opts = ((row.phuong_an ?? []) as PhuongAnJson[])
      .slice()
      .sort((a, b) => a.thu_tu_goc - b.thu_tu_goc);
    const dapAnByNhan = dapAnDungToByNhan(
      row.dap_an_dung as DapAnDung,
      opts.map((o) => ({ id: o.id, nhanGoc: o.nhan_goc })),
    );
    if (!dapAnByNhan) continue;
    out.push({
      maCau: row.ma_cau,
      chuDeMa: row.chu_de_ma,
      chuDeTen: row.chu_de_ten,
      stt: row.import_stt,
      loai: row.loai as DaoTaoQuestionLoai,
      stem: row.stem,
      options: opts.map((o) => ({
        nhanGoc: o.nhan_goc,
        noiDung: o.noi_dung,
        thuTuGoc: o.thu_tu_goc,
      })),
      dapAnByNhan,
      bloomLevel: row.bloom_level as BloomLevel,
      giaiThich: row.giai_thich ?? "",
      isActive: row.is_active,
    });
  }
  return out;
}

export type DaoTaoImportResult = {
  ok: boolean;
  dryRun?: boolean;
  imported: number;
  updated: number;
  inserted: number;
  deactivated: number;
  skipped: number;
  errors: string[];
  message: string;
  audit: {
    insertCount: number;
    updateCount: number;
    deactivateCount: number;
  };
  sampleLines: string[];
};

/** Import upsert theo ma_cau; hỗ trợ dryRun + softDeleteMissing (sync đầy đủ). */
export async function importMcqMatrixAction(input: {
  rows: unknown[][];
  chuDeMa?: string;
  chuDeTen?: string;
  dryRun?: boolean;
  softDeleteMissing?: boolean;
  /** @deprecated Dùng softDeleteMissing (sync_full). */
  replaceActive?: boolean;
}): Promise<DaoTaoImportResult> {
  await verifyPermission("DAO_TAO", "import");
  const admin = createAdminSupabaseClient();
  const fallbackMa = input.chuDeMa ?? DEFAULT_CHU_DE.ma;
  const fallbackTen = input.chuDeTen ?? DEFAULT_CHU_DE.ten;
  const softDeleteMissing = Boolean(input.softDeleteMissing || input.replaceActive);

  const parsed = parseMcqRowsFromMatrix(input.rows);
  if (parsed.questions.length === 0) {
    return {
      ok: false,
      dryRun: input.dryRun,
      imported: 0,
      updated: 0,
      inserted: 0,
      deactivated: 0,
      skipped: parsed.skipped,
      errors: parsed.errors.slice(0, 30),
      message: "Không có câu hỏi hợp lệ để import.",
      audit: { insertCount: 0, updateCount: 0, deactivateCount: 0 },
      sampleLines: [],
    };
  }

  const { data: existingRows, error: exErr } = await admin
    .from("dao_tao_cau_hoi")
    .select(
      "id, ma_cau, chu_de_ma, chu_de_ten, loai, bloom_level, stem, giai_thich, is_active, import_stt, phuong_an, dap_an_dung",
    )
    .limit(10000);
  if (exErr) throw exErr;

  const byMa = new Map<string, DbCauHoi>();
  for (const r of (existingRows ?? []) as DbCauHoi[]) {
    byMa.set(r.ma_cau, r);
  }

  const usedInFile = new Set<string>();
  const prepared: Array<{
    maCau: string;
    chuDeMa: string;
    chuDeTen: string;
    row: ParsedMcqRow;
    existing?: DbCauHoi;
  }> = [];

  for (const row of parsed.questions) {
    const chuDe = resolveChuDe(row, fallbackMa, fallbackTen);
    const maCau = resolveMaCau(row, chuDe.ma, usedInFile);
    prepared.push({
      maCau,
      chuDeMa: chuDe.ma,
      chuDeTen: chuDe.ten,
      row: { ...row, maCau },
      existing: byMa.get(maCau),
    });
  }

  const insertCount = prepared.filter((p) => !p.existing).length;
  const updateCount = prepared.filter((p) => p.existing).length;

  const fileMas = new Set(prepared.map((p) => p.maCau));
  const chuDeInFile = new Set(prepared.map((p) => p.chuDeMa));
  const toDeactivate = ((existingRows ?? []) as DbCauHoi[]).filter(
    (r) => r.is_active && chuDeInFile.has(r.chu_de_ma) && !fileMas.has(r.ma_cau),
  );

  const sampleLines = prepared.slice(0, 5).map((p) => {
    const tag = p.existing ? "UPDATE" : "INSERT";
    return `${tag} ${p.maCau}: ${p.row.stem.slice(0, 60)}`;
  });

  if (input.dryRun) {
    return {
      ok: true,
      dryRun: true,
      imported: 0,
      updated: updateCount,
      inserted: insertCount,
      deactivated: toDeactivate.length,
      skipped: parsed.skipped,
      errors: parsed.errors.slice(0, 40),
      message: `Xem trước: thêm ${insertCount}, cập nhật ${updateCount}, ẩn ${toDeactivate.length} (nếu đồng bộ đầy đủ).`,
      audit: {
        insertCount,
        updateCount,
        deactivateCount: toDeactivate.length,
      },
      sampleLines,
    };
  }

  const errors = [...parsed.errors];
  let inserted = 0;
  let updated = 0;

  for (const p of prepared) {
    const payload = rowToPayload(p.row, p.maCau, p.chuDeMa, p.chuDeTen, p.existing);
    if (p.existing) {
      const { error } = await admin.from("dao_tao_cau_hoi").update(payload).eq("id", p.existing.id);
      if (error) {
        errors.push(`${p.maCau}: ${error.message}`);
        continue;
      }
      updated += 1;
    } else {
      const { error } = await admin.from("dao_tao_cau_hoi").insert({
        ...payload,
        created_at: new Date().toISOString(),
      });
      if (error) {
        errors.push(`${p.maCau}: ${error.message}`);
        continue;
      }
      inserted += 1;
    }
  }

  let deactivated = 0;
  if (softDeleteMissing && toDeactivate.length) {
    const ids = toDeactivate.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error, data } = await admin
        .from("dao_tao_cau_hoi")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", chunk)
        .select("id");
      if (error) {
        errors.push(`Deactivate: ${error.message}`);
      } else {
        deactivated += data?.length ?? chunk.length;
      }
    }
  }

  const imported = inserted + updated;
  return {
    ok: imported > 0 || deactivated > 0,
    imported,
    updated,
    inserted,
    deactivated,
    skipped: parsed.skipped,
    errors: errors.slice(0, 40),
    message: `Đã thêm ${inserted}, cập nhật ${updated}, ẩn ${deactivated} (bỏ qua ${parsed.skipped}).`,
    audit: {
      insertCount: inserted,
      updateCount: updated,
      deactivateCount: deactivated,
    },
    sampleLines,
  };
}

export async function setCauHoiActive(cauHoiId: string, isActive: boolean) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("dao_tao_cau_hoi")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", cauHoiId);
  if (error) throw error;
  return { ok: true };
}

export async function updateCauHoiDaoTao(input: {
  id: string;
  stem: string;
  bloomLevel: BloomLevel;
  giaiThich?: string;
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  dapAnRaw: string;
  loai: DaoTaoQuestionLoai;
}) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();

  const { data: existing, error: loadErr } = await admin
    .from("dao_tao_cau_hoi")
    .select(
      "id, ma_cau, chu_de_ma, chu_de_ten, loai, bloom_level, stem, giai_thich, is_active, import_stt, phuong_an, dap_an_dung",
    )
    .eq("id", input.id)
    .single();
  if (loadErr) throw loadErr;

  const matrix = [
    [
      existing.ma_cau,
      existing.chu_de_ma,
      existing.chu_de_ten,
      existing.import_stt ?? "",
      input.loai,
      input.stem.trim(),
      input.optionA.trim(),
      input.optionB.trim(),
      (input.optionC ?? "").trim(),
      (input.optionD ?? "").trim(),
      input.dapAnRaw.trim(),
      String(input.bloomLevel),
      (input.giaiThich ?? "").trim(),
      existing.is_active ? "true" : "false",
    ],
  ];
  const parsed = parseMcqRowsFromMatrix([[...requireBankHeader()], ...matrix]);
  if (!parsed.questions[0]) {
    throw new Error(parsed.errors[0] || "Dữ liệu sửa không hợp lệ.");
  }
  const row = parsed.questions[0];
  const payload = rowToPayload(
    row,
    existing.ma_cau,
    existing.chu_de_ma,
    existing.chu_de_ten,
    existing as DbCauHoi,
  );
  // Giữ bloom từ form (parser nhận "3").
  payload.bloom_level = input.bloomLevel;
  payload.giai_thich = (input.giaiThich ?? "").trim() || null;

  const { error } = await admin.from("dao_tao_cau_hoi").update(payload).eq("id", input.id);
  if (error) throw error;
  return { ok: true };
}

function requireBankHeader(): string[] {
  return [
    "ma_cau",
    "chu_de_ma",
    "chu_de_ten",
    "stt",
    "loai",
    "stem",
    "A",
    "B",
    "C",
    "D",
    "dap_an",
    "bloom",
    "giai_thich",
    "is_active",
  ];
}

export async function getCauHoiDetail(id: string) {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hoi")
    .select(
      "id, ma_cau, chu_de_ma, chu_de_ten, loai, bloom_level, stem, giai_thich, is_active, import_stt, phuong_an, dap_an_dung",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
