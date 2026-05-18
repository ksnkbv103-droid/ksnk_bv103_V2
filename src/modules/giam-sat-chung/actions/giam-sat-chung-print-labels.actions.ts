"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { GscPrintLabelPack } from "../lib/gsc-session-labels";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { resolveGscScopedKhoaId } from "../lib/gsc-khoa-scope";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

/** Tên khoa / khu / đối tượng / nghề theo FK — chỉ cần GIAM_SAT_CHUNG:view (không phụ thuộc dropdown DANH_MUC). */
export async function getGscSessionPrintLabels(input: {
  khoa_id?: unknown;
  khu_vuc_id?: unknown;
  nhan_vien_id?: unknown;
  nghe_nghiep_id?: unknown;
  nguoi_giam_sat_id?: unknown;
}): Promise<{ success: true; data: GscPrintLabelPack } | { success: false; error: string }> {
  /** Giống bundle header form: đọc master sau verify — tránh RLS anon chặn tên khoa/khu trên phiếu in. */
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();
    const requestedKhoaId = String(input.khoa_id ?? "").trim() || null;
    const scopedKhoa = resolveGscScopedKhoaId(scope, requestedKhoaId);
    if (!scopedKhoa.ok) {
      return { success: false, error: scopedKhoa.error };
    }
    const khoaId = scopedKhoa.khoaId || "";
    const actorKhoaId = scope.actorKhoaId ? String(scope.actorKhoaId) : null;
    const khuId = String(input.khu_vuc_id ?? "").trim();
    const nvId = String(input.nhan_vien_id ?? "").trim();
    const nnId = String(input.nghe_nghiep_id ?? "").trim();
    const ngsId = String(input.nguoi_giam_sat_id ?? "").trim();

    const khoaP = khoaId
      ? supabase.from("dm_khoa_phong").select("ten_khoa").eq("id", khoaId).maybeSingle()
      : Promise.resolve({ data: null as { ten_khoa?: string } | null, error: null });
    const khuP = khuId
      ? supabase.from("dm_khu_vuc_giam_sat").select("ten_khu_vuc").eq("id", khuId).maybeSingle()
      : Promise.resolve({ data: null as { ten_khu_vuc?: string } | null, error: null });
    const nvP = nvId
      ? (() => {
          let q = supabase.from("mdm_nhan_su").select("ho_ten, khoa_id").eq("id", nvId);
          if (scope.isMangLuoiKsnk && actorKhoaId) q = q.eq("khoa_id", actorKhoaId);
          return q.maybeSingle();
        })()
      : Promise.resolve({ data: null as { ho_ten?: string; khoa_id?: string } | null, error: null });
    const nnP = nnId
      ? supabase.from("dm_nghe_nghiep").select("ten_nghe_nghiep").eq("id", nnId).maybeSingle()
      : Promise.resolve({ data: null as { ten_nghe_nghiep?: string } | null, error: null });
    const ngsP = ngsId
      ? (() => {
          let q = supabase.from("mdm_nhan_su").select("ho_ten, khoa_id").eq("id", ngsId);
          if (scope.isMangLuoiKsnk && actorKhoaId) q = q.eq("khoa_id", actorKhoaId);
          return q.maybeSingle();
        })()
      : Promise.resolve({ data: null as { ho_ten?: string; khoa_id?: string } | null, error: null });

    const [khoaR, khuR, nvR, nnR, ngsR] = await Promise.all([khoaP, khuP, nvP, nnP, ngsP]);
    if (khoaR.error) throw khoaR.error;
    if (khuR.error) throw khuR.error;
    if (nvR.error) throw nvR.error;
    if (nnR.error) throw nnR.error;
    if (ngsR.error) throw ngsR.error;

    const data: GscPrintLabelPack = {
      khoa_ten: khoaId ? String(khoaR.data?.ten_khoa || "").trim() || undefined : undefined,
      khu_ten: khuId ? String(khuR.data?.ten_khu_vuc || "").trim() || undefined : undefined,
      ho_ten_doi_tuong: nvId ? String(nvR.data?.ho_ten || "").trim() || undefined : undefined,
      nghe_ten: nnId ? String(nnR.data?.ten_nghe_nghiep || "").trim() || undefined : undefined,
      ho_ten_nguoi_gs: ngsId ? String(ngsR.data?.ho_ten || "").trim() || undefined : undefined,
    };
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
