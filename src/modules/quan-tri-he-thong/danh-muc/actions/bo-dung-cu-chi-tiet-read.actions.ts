"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { revalidatePath } from "next/cache";
import type { BoDungCuChiTietPreviewRow, BoRefByLoai } from "./bo-dung-cu-chi-tiet.types";

/** Danh sách dụng cụ chi tiết thuộc một bộ (`dm_bo_dung_cu_chi_tiet`). Quyền `BO_DC.view`. */
export async function getBoDungCuChiTietPreviewAction(boDungCuId: string) {
  await verifyPermission("BO_DC", "view");
  const bid = String(boDungCuId || "").trim();
  if (!bid) return { success: false as const, error: "Thiếu thiết bị bộ (id)." };

  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase
    .from("dm_bo_dung_cu_chi_tiet")
    .select(
      "id, ma_chi_tiet, ten_chi_tiet, ten_dung_cu_le, loai_dung_cu_id, so_luong, max_suds_count, trong_luong, ghi_chu, is_active",
    )
    .eq("bo_dung_cu_id", bid)
    .order("is_active", { ascending: false })
    .order("ma_chi_tiet", { ascending: true });
  if (error) return { success: false as const, error: error.message };

  const rows = (data || []) as BoDungCuChiTietPreviewRow[];
  const loaiIds = [...new Set(rows.map((r) => String(r.loai_dung_cu_id || "").trim()).filter(Boolean))];
  if (!loaiIds.length) {
    return {
      success: true as const,
      data: rows.map((r) => ({ ...r, loai_dung_cu: null })),
    };
  }

  const { data: loais, error: le } = await supabase
    .from("dm_loai_dung_cu")
    .select("id, ma_loai, ma_loai_dung_cu, ten_loai, ten_loai_dung_cu")
    .in("id", loaiIds);
  if (le) return { success: false as const, error: le.message };

  const loaiMap = new Map(
    (loais || []).map((x) => {
      const ma = x.ma_loai_dung_cu ?? x.ma_loai ?? null;
      const ten = x.ten_loai_dung_cu ?? x.ten_loai ?? "";
      return [
        String(x.id),
        { ma_danh_muc: ma != null ? String(ma) : null, ten_danh_muc: ten ? String(ten) : null },
      ] as const;
    }),
  );

  const enriched: BoDungCuChiTietPreviewRow[] = rows.map((r) => ({
    ...r,
    loai_dung_cu: r.loai_dung_cu_id ? loaiMap.get(String(r.loai_dung_cu_id)) ?? null : null,
  }));

  return { success: true as const, data: enriched };
}

/** Tìm các bộ khác cũng đang dùng cùng `loai_dung_cu_id` của chi tiết đã chọn. */
export async function getBoRefsByLoaiAction(loaiDungCuId: string, excludeBoId?: string | null) {
  await verifyPermission("BO_DC", "view");
  const loaiId = String(loaiDungCuId || "").trim();
  if (!loaiId) return { success: true as const, data: [] as BoRefByLoai[] };
  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase
    .from("dm_bo_dung_cu_chi_tiet")
    .select("bo_dung_cu_id")
    .eq("loai_dung_cu_id", loaiId)
    .eq("is_active", true);
  if (error) return { success: false as const, error: error.message };
  const ex = String(excludeBoId || "").trim();
  const boIds = [
    ...new Set(
      (data || [])
        .map((x) => String((x as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || "").trim())
        .filter((id) => Boolean(id) && id !== ex),
    ),
  ];
  if (!boIds.length) return { success: true as const, data: [] as BoRefByLoai[] };
  const { data: bos, error: be } = await supabase
    .from("dm_bo_dung_cu")
    .select("id, ma_bo, ten_bo")
    .in("id", boIds)
    .order("ma_bo", { ascending: true });
  if (be) return { success: false as const, error: be.message };
  return { success: true as const, data: (bos || []) as BoRefByLoai[] };
}

/** Ghi nhận sự vụ hỏng/mất ở mức chi tiết bằng audit note, không phá dữ liệu gốc. */
export async function appendChiTietIssueNoteAction(params: {
  chiTietId: string;
  issueType: "HONG" | "MAT";
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  const supabase = await createServerSupabaseUserClient();
  const id = String(params.chiTietId || "").trim();
  if (!id) return { success: false as const, error: "Thiếu id dụng cụ chi tiết." };

  const { data: row, error } = await supabase
    .from("dm_bo_dung_cu_chi_tiet")
    .select("ghi_chu, bo_dung_cu_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { success: false as const, error: error.message };
  const oldNote = String((row as { ghi_chu?: string | null } | null)?.ghi_chu || "").trim();
  const oldBoId = String((row as { bo_dung_cu_id?: string | null } | null)?.bo_dung_cu_id || "").trim();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const line = `[${params.issueType}] ${now}${params.note ? ` - ${String(params.note).trim()}` : ""}`;
  const detachLine = oldBoId ? `[AUTO] ${now} - Tách khỏi bộ hiện tại do báo ${params.issueType === "HONG" ? "hỏng" : "mất"}.` : "";
  const nextNote = oldNote
    ? `${oldNote}\n${line}${detachLine ? `\n${detachLine}` : ""}`
    : `${line}${detachLine ? `\n${detachLine}` : ""}`;

  const { error: ue } = await supabase
    .from("dm_bo_dung_cu_chi_tiet")
    .update({
      ghi_chu: nextNote,
      // Nghiệp vụ: khi báo hỏng/mất thì dụng cụ không còn là thành phần của bộ hiện hành.
      bo_dung_cu_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (ue) return { success: false as const, error: ue.message };
  revalidatePath("/quan-tri-he-thong/danh-muc/dung-cu/bo");
  revalidatePath("/quan-tri-he-thong/danh-muc/dung-cu/chi-tiet");
  return { success: true as const };
}
