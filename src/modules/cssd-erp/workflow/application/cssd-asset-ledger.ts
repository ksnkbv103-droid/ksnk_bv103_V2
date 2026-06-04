import type { SupabaseClient } from "@supabase/supabase-js";

export type ThanhPhanRow = {
  quy_trinh_id: string;
  dm_bo_dung_cu_chi_tiet_id: string | null;
  ten_dung_cu_le: string;
  so_luong_ke_hoach: number;
  so_luong_thuc_te: number;
};

/** Đồng bộ sổ cấu phần runtime từ danh mục bộ (template). */
export async function syncThanhPhanTuTemplate(
  supabase: SupabaseClient,
  quyTrinhId: string,
  boDungCuId: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const qtId = String(quyTrinhId || "").trim();
  const boId = String(boDungCuId || "").trim();
  if (!qtId) return { ok: false, message: "Thiếu quy_trinh_id." };
  if (!boId) return { ok: false, message: "Chưa gán bộ dụng cụ (bo_dung_cu_id) — không có khuôn mẫu cấu phần." };

  const { data: existing, error: exErr } = await supabase
    .from("cssd_fact_quy_trinh_thanh_phan")
    .select("id")
    .eq("quy_trinh_id", qtId)
    .eq("is_active", true)
    .limit(1);
  if (exErr) return { ok: false, message: exErr.message };
  if ((existing || []).length > 0) return { ok: true };

  const { data: lines, error: lErr } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .select("id, ten_dung_cu_le, so_luong")
    .eq("bo_dung_cu_id", boId)
    .eq("is_active", true);
  if (lErr) return { ok: false, message: lErr.message };

  const rows = (lines || []).map(
    (ln: { id?: string; ten_dung_cu_le?: string | null; so_luong?: number | null }) => {
      const qty = Number(ln.so_luong ?? 1) || 1;
      const ten = String(ln.ten_dung_cu_le || "").trim() || "—";
      return {
        quy_trinh_id: qtId,
        dm_bo_dung_cu_chi_tiet_id: ln.id ? String(ln.id) : null,
        ten_dung_cu_le: ten,
        so_luong_ke_hoach: qty,
        so_luong_thuc_te: qty,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    },
  );
  if (!rows.length) return { ok: true };

  const { error: insErr } = await supabase.from("cssd_fact_quy_trinh_thanh_phan").insert(rows);
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}

function assertDuSoThanhPhan(rows: ThanhPhanRow[]): { ok: true } | { ok: false; message: string } {
  for (const r of rows) {
    if (r.so_luong_thuc_te < r.so_luong_ke_hoach) {
      return {
        ok: false,
        message: `Thiếu cấu phần «${r.ten_dung_cu_le}»: thực tế ${r.so_luong_thuc_te}/${r.so_luong_ke_hoach}.`,
      };
    }
  }
  return { ok: true };
}

/** Kiểm tra cấu phần trước cấp phát — không bypass ledger; thiếu cấu phần trả warning (Q2 QLDCPT). */
export type LedgerCapPhatResult =
  | { ok: true }
  | { ok: true; warning: string }
  | { ok: false; message: string };

export async function assertLedgerDuChoCapPhat(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<LedgerCapPhatResult> {
  const id = String(quyTrinhId || "").trim();
  if (!id) return { ok: false, message: "Thiếu quy_trinh_id." };

  const { data: qt, error: qtErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id, bo_dung_cu_id")
    .eq("id", id)
    .maybeSingle();
  if (qtErr) return { ok: false, message: qtErr.message };

  const boId = String((qt as { bo_dung_cu_id?: string | null } | null)?.bo_dung_cu_id || "").trim();
  if (!boId) return { ok: false, message: "Quy trình chưa gán bộ dụng cụ — không thể kiểm tra BOM." };

  const sync = await syncThanhPhanTuTemplate(supabase, id, boId);
  if (!sync.ok) return { ok: false, message: sync.message };

  const { data: events, error: evErr } = await supabase
    .from("cssd_fact_lifecycle_event")
    .select("id")
    .eq("quy_trinh_id", id)
    .eq("ma_su_kien", "KIEM_DEM_BOM")
    .limit(1);
  if (evErr) return { ok: false, message: evErr.message };

  const hasChecklist = (events || []).length > 0;
  if (!hasChecklist) {
    return {
      ok: false,
      message:
        "Bộ dụng cụ CHƯA QUA KIỂM ĐẾM số hóa tại trạm Đóng gói. Vui lòng xác nhận Digital BOM trước khi cấp phát.",
    };
  }

  const { data, error } = await supabase
    .from("cssd_fact_quy_trinh_thanh_phan")
    .select("quy_trinh_id, dm_bo_dung_cu_chi_tiet_id, ten_dung_cu_le, so_luong_ke_hoach, so_luong_thuc_te")
    .eq("quy_trinh_id", id)
    .eq("is_active", true);
  if (error) return { ok: false, message: error.message };

  const rows = (data || []) as ThanhPhanRow[];
  if (!rows.length) {
    return { ok: false, message: "Chưa khởi tạo sổ cấu phần (BOM runtime) cho quy trình này." };
  }

  const duSo = assertDuSoThanhPhan(rows);
  if (!duSo.ok) {
    return { ok: false, message: duSo.message };
  }
  return { ok: true };
}
