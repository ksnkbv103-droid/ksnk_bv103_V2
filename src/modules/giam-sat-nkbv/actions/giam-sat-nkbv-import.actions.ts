"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { buildViSinhUniqueKey } from "../lib/nkbv-vi-sinh-unique-key";
import type { NkbvViSinhKetQua } from "../lib/nkbv-vi-sinh-template";
import {
  scanImportWindowAlerts,
  type ExistingNkbvEventForScan,
  type ImportWindowAlert,
} from "../lib/nkbv-import-window-scan";
import type { NkbvMdroPhenotype, NkbvMdroSource } from "../lib/nkbv-mdro";
import { decideBenhAnImportRow } from "../lib/nkbv-benh-an-import-policy";
import { nkbvVnDateStartIso } from "../lib/nkbv-ba-ngay";

export type ViSinhRecordInput = {
  ma_benh_nhan: string;
  ma_benh_an: string;
  ma_xet_nghiem: string;
  ma_benh_pham?: string;
  ho_ten_benh_nhan: string;
  ngay_sinh?: string;
  gioi_tinh?: string;
  ngay_vao_vien: string;
  ngay_lay_mau: string;
  khoa_yeu_cau_id?: string;
  loai_benh_pham: string;
  tac_nhan: string;
  so_luong?: string;
  ket_qua: NkbvViSinhKetQua;
  is_mdro?: boolean;
  mdro_phenotype?: NkbvMdroPhenotype | null;
  mdro_source?: NkbvMdroSource;
  /** Metadata LIS gốc (barcode, chẩn đoán, …). */
  lis_metadata?: Record<string, string>;
};

/** Preview cảnh báo RIT/SBAP trước khi đẩy DB (cùng ma_benh_an với ca đang mở). */
export async function previewViSinhImportAlerts(
  rows: Array<{ ma_benh_an: string; ngay_lay_mau: string; loai_benh_pham: string; ma_xet_nghiem: string }>,
): Promise<{ success: true; alertsByXn: Record<string, ImportWindowAlert[]> } | { success: false; error: string }> {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const stayIds = Array.from(new Set(rows.map((r) => r.ma_benh_an).filter(Boolean)));
    if (stayIds.length === 0) return { success: true, alertsByXn: {} };

    const { data: existingEvents, error } = await supabase
      .from("nkbv_fact_su_kien")
      .select("id, ma_benh_an, ngay_phat_hien, vi_tri_nhiem_khuan")
      .in("ma_benh_an", stayIds)
      .eq("is_active", true);
    if (error) throw error;

    const mapped: ExistingNkbvEventForScan[] = (existingEvents || []).map((e: any) => ({
      id: e.id,
      ma_benh_an: e.ma_benh_an,
      ngay_phat_hien: e.ngay_phat_hien,
      vi_tri_nhiem_khuan: e.vi_tri_nhiem_khuan,
    }));

    const alertsByXn: Record<string, ImportWindowAlert[]> = {};
    for (const r of rows) {
      alertsByXn[r.ma_xet_nghiem] = scanImportWindowAlerts({
        ma_benh_an: r.ma_benh_an,
        ngay_lay_mau: r.ngay_lay_mau,
        loai_benh_pham: r.loai_benh_pham,
        existingEvents: mapped,
      });
    }
    return { success: true, alertsByXn };
  } catch (e: any) {
    return { success: false, error: e.message || "Lỗi rà soát khung thời gian" };
  }
}

/** Nạp kết quả vi sinh LIS theo mẫu cố định (âm / dương / nhiễu). */
export async function importViSinhExcel(records: ViSinhRecordInput[]) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  const supabase = createAdminSupabaseClient();

  try {
    for (const r of records) {
      if (!r.ma_benh_an?.trim()) {
        return { success: false as const, error: "Thiếu mã bệnh án (ma_benh_an) — không tự sinh mã giả." };
      }
      if (!r.ma_xet_nghiem?.trim()) {
        return { success: false as const, error: "Thiếu mã xét nghiệm (ma_xet_nghiem)." };
      }
      if (!r.ket_qua) {
        return { success: false as const, error: "Thiếu phân loại kết quả (ket_qua)." };
      }
    }

    const uniqueStays = Array.from(
      new Map(
        records.map((r) => [
          r.ma_benh_an,
          {
            ma_benh_an: r.ma_benh_an,
            ma_benh_nhan: r.ma_benh_nhan,
            ho_ten_benh_nhan: r.ho_ten_benh_nhan,
            ngay_sinh: r.ngay_sinh ? r.ngay_sinh.slice(0, 10) : null,
            gioi_tinh: r.gioi_tinh ?? null,
            ngay_vao_vien: r.ngay_vao_vien
              ? nkbvVnDateStartIso(String(r.ngay_vao_vien).slice(0, 10))
              : nkbvVnDateStartIso(new Date().toISOString().slice(0, 10)),
            khoa_dieu_tri_id: r.khoa_yeu_cau_id || null,
            is_active: true,
          },
        ]),
      ).values(),
    );

    for (const stay of uniqueStays) {
      const { data: existingStay } = await supabase
        .from("nkbv_fact_benh_an")
        .select("id")
        .eq("ma_benh_an", stay.ma_benh_an)
        .eq("is_active", true)
        .maybeSingle();

      if (!existingStay) {
        const { error: stayErr } = await supabase.from("nkbv_fact_benh_an").insert(stay);
        if (stayErr) throw stayErr;
        if (stay.khoa_dieu_tri_id) {
          await supabase.from("nkbv_fact_ba_ngay_khoa").upsert(
            {
              ma_benh_an: stay.ma_benh_an,
              ngay_lich: String(stay.ngay_vao_vien).slice(0, 10),
              khoa_id: stay.khoa_dieu_tri_id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "ma_benh_an,ngay_lich" },
          );
        }
      }
    }

    for (const r of records) {
      if (r.is_mdro && !r.mdro_phenotype) {
        return {
          success: false as const,
          error: `XN ${r.ma_xet_nghiem}: đa kháng phải chọn phenotype (MRSA/VRE/CRE/…).`,
        };
      }
    }

    const recordsToInsert = records.map((r) => {
      const unique_key = buildViSinhUniqueKey({ ma_xet_nghiem: r.ma_xet_nghiem });
      const is_mdro = Boolean(r.is_mdro);
      const mdro_phenotype = is_mdro ? r.mdro_phenotype || null : null;
      const mdro_source: NkbvMdroSource | null = is_mdro
        ? r.mdro_source || (r.lis_metadata?.is_mdro ? "LIS" : "MANUAL")
        : null;
      return {
        ma_benh_nhan: r.ma_benh_nhan,
        ma_benh_an: r.ma_benh_an,
        ma_benh_pham: r.ma_benh_pham || null,
        ma_xet_nghiem: r.ma_xet_nghiem.trim(),
        ho_ten_benh_nhan: r.ho_ten_benh_nhan,
        ngay_sinh: r.ngay_sinh ? r.ngay_sinh.slice(0, 10) : null,
        gioi_tinh: r.gioi_tinh ?? null,
        ngay_vao_vien: new Date(r.ngay_vao_vien).toISOString(),
        ngay_lay_mau: new Date(r.ngay_lay_mau).toISOString(),
        khoa_yeu_cau_id: r.khoa_yeu_cau_id || null,
        loai_benh_pham: r.loai_benh_pham,
        tac_nhan: r.tac_nhan || "—",
        so_luong: r.so_luong ?? null,
        ket_qua_phan_loai: r.ket_qua,
        ket_qua_duong_tinh: r.ket_qua === "DUONG_TINH",
        is_mdro,
        mdro_phenotype,
        mdro_source,
        is_active: true,
        metadata: {
          unique_key,
          ma_xet_nghiem: r.ma_xet_nghiem.trim(),
          ket_qua: r.ket_qua,
          ...(r.lis_metadata || {}),
        },
      };
    });

    if (recordsToInsert.length === 0) {
      return { success: true as const, count: 0, createdCasesCount: 0, mergedRitCount: 0, skippedDuplicate: 0 };
    }

    const xnList = recordsToInsert.map((r) => r.ma_xet_nghiem);
    const { data: existingByXn, error: fetchErr } = await supabase
      .from("nkbv_fact_vi_sinh")
      .select("ma_xet_nghiem, metadata")
      .eq("is_active", true)
      .in("ma_xet_nghiem", xnList);
    if (fetchErr) throw fetchErr;

    const existingKeysSet = new Set<string>();
    for (const row of existingByXn || []) {
      if (row.ma_xet_nghiem) existingKeysSet.add(String(row.ma_xet_nghiem));
      const mk = (row as any).metadata?.unique_key;
      if (mk) existingKeysSet.add(String(mk));
    }

    const filteredRecords = recordsToInsert.filter(
      (r) => !existingKeysSet.has(r.ma_xet_nghiem) && !existingKeysSet.has(r.metadata.unique_key),
    );
    const skippedDuplicate = recordsToInsert.length - filteredRecords.length;

    if (filteredRecords.length === 0) {
      return {
        success: true as const,
        count: 0,
        createdCasesCount: 0,
        mergedRitCount: 0,
        skippedDuplicate,
      };
    }

    const { error: insertErr } = await supabase.from("nkbv_fact_vi_sinh").insert(filteredRecords);
    if (insertErr) throw insertErr;

    // Kho vi sinh chỉ lưu dữ liệu thô toàn viện — không spawn phiếu điều tra HAI.
    // Phân tích / chốt sự kiện chỉ trên Hub bệnh án (timeline → form mẫu).
    revalidatePath("/giam-sat-nkbv");
    return {
      success: true as const,
      count: filteredRecords.length,
      createdCasesCount: 0,
      mergedRitCount: 0,
      skippedDuplicate,
    };
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi xử lý import vi sinh" };
  }
}

export type BenhAnRecordInput = {
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_vao_vien: string;
  khoa_dieu_tri_id?: string;
  ngay_sinh?: string;
  gioi_tinh?: string;
  ngay_ra_vien?: string;
};

/**
 * Nạp hồ sơ bệnh án (ADT/HIS) vào nkbv_fact_benh_an.
 * Đã có mã bệnh án → không đè hồ sơ (skippedExisting). Conflict PID → skippedConflict.
 * Không tạo phiếu HAI — chỉ stay pool.
 */
export async function importBenhAnExcel(records: BenhAnRecordInput[]) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  const supabase = createAdminSupabaseClient();

  try {
    for (const r of records) {
      if (!r.ma_benh_an?.trim()) {
        return { success: false as const, error: "Thiếu mã bệnh án (ma_benh_an)." };
      }
      if (!r.ma_benh_nhan?.trim()) {
        return { success: false as const, error: "Thiếu mã bệnh nhân (ma_benh_nhan)." };
      }
      if (!r.ho_ten_benh_nhan?.trim()) {
        return { success: false as const, error: "Thiếu họ tên bệnh nhân." };
      }
      if (!r.ngay_vao_vien?.trim()) {
        return { success: false as const, error: "Thiếu ngày vào viện." };
      }
    }

    const baList = Array.from(new Set(records.map((r) => r.ma_benh_an.trim())));
    const { data: existing, error: fetchErr } = await supabase
      .from("nkbv_fact_benh_an")
      .select("id, ma_benh_an, ma_benh_nhan")
      .in("ma_benh_an", baList)
      .eq("is_active", true);
    if (fetchErr) throw fetchErr;

    const existingByBa = new Map<string, { id: string; ma_benh_nhan: string }>();
    for (const row of existing || []) {
      existingByBa.set(String(row.ma_benh_an).toUpperCase(), {
        id: String(row.id),
        ma_benh_nhan: String(row.ma_benh_nhan || ""),
      });
    }

    let inserted = 0;
    let skippedExisting = 0;
    let skippedDuplicate = 0;
    let skippedConflict = 0;
    const seenBa = new Set<string>();
    const nowIso = new Date().toISOString();

    for (const r of records) {
      const ba = r.ma_benh_an.trim();
      const bn = r.ma_benh_nhan.trim();
      const baKey = ba.toUpperCase();
      if (seenBa.has(baKey)) {
        skippedDuplicate += 1;
        continue;
      }
      seenBa.add(baKey);

      const payload = {
        ma_benh_an: ba,
        ma_benh_nhan: bn,
        ho_ten_benh_nhan: r.ho_ten_benh_nhan.trim(),
        ngay_sinh: r.ngay_sinh ? r.ngay_sinh.slice(0, 10) : null,
        gioi_tinh: r.gioi_tinh?.trim() || null,
        ngay_vao_vien: nkbvVnDateStartIso(r.ngay_vao_vien.slice(0, 10)),
        ngay_ra_vien: r.ngay_ra_vien ? nkbvVnDateStartIso(r.ngay_ra_vien.slice(0, 10)) : null,
        khoa_dieu_tri_id: r.khoa_dieu_tri_id || null,
        is_active: true,
        updated_at: nowIso,
      };

      const prev = existingByBa.get(baKey);
      if (prev) {
        const decision = decideBenhAnImportRow({
          existingPid: prev.ma_benh_nhan,
          incomingPid: bn,
        });
        if (decision === "skip_conflict") skippedConflict += 1;
        else skippedExisting += 1;
        continue;
      }

      const { error: insertErr } = await supabase.from("nkbv_fact_benh_an").insert(payload);
      if (insertErr) throw insertErr;
      if (payload.khoa_dieu_tri_id) {
        await supabase.from("nkbv_fact_ba_ngay_khoa").upsert(
          {
            ma_benh_an: ba,
            ngay_lich: String(r.ngay_vao_vien).slice(0, 10),
            khoa_id: payload.khoa_dieu_tri_id,
            updated_at: nowIso,
          },
          { onConflict: "ma_benh_an,ngay_lich" },
        );
      }
      inserted += 1;
    }

    revalidatePath("/giam-sat-nkbv");
    return {
      success: true as const,
      count: inserted,
      inserted,
      updated: 0,
      skippedExisting,
      skippedDuplicate,
      skippedConflict,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi xử lý import hồ sơ bệnh án";
    return { success: false as const, error: msg };
  }
}
