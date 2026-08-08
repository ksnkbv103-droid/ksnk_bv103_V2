"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { validateAssigneeForQlcv } from "../lib/qlcv-ksnk-server";
import { normalizeQlcvStaffIdList } from "../lib/qlcv-staff-ids";
import { formatQlcvDbError, throwQlcvDbError } from "../lib/qlcv-supabase-error";
import { resolveQlcvNhiemVuId } from "../lib/qlcv-nhiem-vu-chain";

const NV_TABLE = "qlcv_fact_nhiem_vu";

export type NhiemVuTrangThai = "NHAP" | "DANG_LAM" | "HOAN_THANH" | "TAM_DUNG" | "HUY";
export type ChuKyGoiY = "TUAN" | "THANG" | "QUY" | "NAM" | "MOT_LAN";

export type NhiemVuRow = {
  id: string;
  ten: string;
  pham_vi_ap_dung: string | null;
  chi_tieu: string | null;
  chi_dao: string | null;
  bien_phap: string | null;
  noi_dung_can_dat: string | null;
  khung_thoi_gian_ghi_chu: string | null;
  chu_ky_goi_y: ChuKyGoiY | null;
  nam: number;
  quy: number | null;
  thang: number | null;
  nguoi_chu_tri_id: string | null;
  nguoi_chu_tri_ten?: string | null;
  nguoi_phoi_hop_ids: string[];
  han_hoan_thanh: string | null;
  trang_thai: NhiemVuTrangThai;
  thu_tu: number;
  is_active: boolean;
  pct?: number;
  task_count?: number;
  task_done_count?: number;
};

const NV_SELECT =
  "id,ten,pham_vi_ap_dung,chi_tieu,chi_dao,bien_phap,noi_dung_can_dat,khung_thoi_gian_ghi_chu,chu_ky_goi_y,nam,quy,thang,nguoi_chu_tri_id,nguoi_phoi_hop_ids,han_hoan_thanh,trang_thai,thu_tu,is_active,created_at,updated_at";

function mapNv(row: Record<string, unknown>): NhiemVuRow {
  return {
    id: String(row.id),
    ten: String(row.ten ?? ""),
    pham_vi_ap_dung: (row.pham_vi_ap_dung as string) ?? null,
    chi_tieu: (row.chi_tieu as string) ?? null,
    chi_dao: (row.chi_dao as string) ?? null,
    bien_phap: (row.bien_phap as string) ?? null,
    noi_dung_can_dat: (row.noi_dung_can_dat as string) ?? null,
    khung_thoi_gian_ghi_chu: (row.khung_thoi_gian_ghi_chu as string) ?? null,
    chu_ky_goi_y: (row.chu_ky_goi_y as ChuKyGoiY) ?? null,
    nam: Number(row.nam),
    quy: row.quy != null ? Number(row.quy) : null,
    thang: row.thang != null ? Number(row.thang) : null,
    nguoi_chu_tri_id: (row.nguoi_chu_tri_id as string) ?? null,
    nguoi_phoi_hop_ids: normalizeQlcvStaffIdList(row.nguoi_phoi_hop_ids as string[]),
    han_hoan_thanh: row.han_hoan_thanh ? String(row.han_hoan_thanh).slice(0, 10) : null,
    trang_thai: row.trang_thai as NhiemVuTrangThai,
    thu_tu: Number(row.thu_tu ?? 0),
    is_active: Boolean(row.is_active),
  };
}

async function attachChuTriTen(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rows: NhiemVuRow[],
): Promise<NhiemVuRow[]> {
  const ids = [...new Set(rows.map((r) => r.nguoi_chu_tri_id).filter(Boolean))] as string[];
  if (ids.length === 0) return rows;
  const { data: ns } = await supabase.from("mdm_nhan_su").select("id,ho_ten").in("id", ids);
  const map = new Map(((ns || []) as Array<{ id: string; ho_ten: string }>).map((n) => [n.id, n.ho_ten]));
  return rows.map((r) =>
    r.nguoi_chu_tri_id ? { ...r, nguoi_chu_tri_ten: map.get(r.nguoi_chu_tri_id) ?? null } : r,
  );
}

async function attachTaskRollup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rows: NhiemVuRow[],
): Promise<NhiemVuRow[]> {
  if (rows.length === 0) return rows;
  const { data, error } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id,nhiem_vu_id,trang_thai,phan_tram_hoan_thanh,is_active")
    .in(
      "nhiem_vu_id",
      rows.map((r) => r.id),
    )
    .eq("is_active", true)
    .limit(5000);
  if (error) {
    console.error("[QLCV] attachTaskRollup", error);
    return rows;
  }
  const byNv = new Map<string, Array<{ pct: number; done: boolean }>>();
  for (const t of (data || []) as Record<string, unknown>[]) {
    const nvId = t.nhiem_vu_id as string | null;
    if (!nvId) continue;
    const list = byNv.get(nvId) || [];
    const tt = String(t.trang_thai ?? "");
    list.push({
      pct: Number(t.phan_tram_hoan_thanh ?? 0),
      done: tt === "HOAN_THANH",
    });
    byNv.set(nvId, list);
  }
  return rows.map((r) => {
    const tasks = byNv.get(r.id) || [];
    const task_count = tasks.length;
    const task_done_count = tasks.filter((t) => t.done).length;
    const pct =
      task_count === 0 ? 0 : Math.round(tasks.reduce((a, t) => a + t.pct, 0) / task_count);
    return { ...r, pct, task_count, task_done_count };
  });
}

/** Danh sách nhiệm vụ theo năm (độc lập — không kế hoạch năm). */
export async function listNhiemVuByNam(nam: number): Promise<NhiemVuRow[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const { data, error } = await supabase
    .from(NV_TABLE)
    .select(NV_SELECT)
    .eq("nam", nam)
    .eq("is_active", true)
    .order("thu_tu", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(formatQlcvDbError(error.message || "Không tải nhiệm vụ."));

  let rows = ((data || []) as Record<string, unknown>[]).map(mapNv);
  rows = await attachChuTriTen(supabase, rows);
  return attachTaskRollup(supabase, rows);
}

export type NhiemVuSelectOption = {
  id: string;
  label: string;
  nam: number;
};

export async function listNhiemVuOptions(): Promise<NhiemVuSelectOption[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const { data, error } = await supabase
    .from(NV_TABLE)
    .select("id,ten,nam,quy,thang,thu_tu")
    .eq("is_active", true)
    .neq("trang_thai", "HUY")
    .order("nam", { ascending: false })
    .order("thu_tu", { ascending: true })
    .limit(500);
  if (error) throw new Error(formatQlcvDbError(error.message || "Không tải nhiệm vụ."));

  return ((data || []) as Array<{ id: string; ten: string; nam: number; quy: number | null; thang: number | null }>).map(
    (nv) => {
      const ky =
        nv.thang != null ? `T${nv.thang}` : nv.quy != null ? `Q${nv.quy}` : "";
      const prefix = ky ? `${nv.nam} · ${ky}` : String(nv.nam);
      return { id: nv.id, nam: nv.nam, label: `${prefix} → ${nv.ten}` };
    },
  );
}

export async function upsertNhiemVu(input: {
  id?: string;
  ten: string;
  pham_vi_ap_dung?: string | null;
  chi_tieu?: string | null;
  chi_dao?: string | null;
  bien_phap?: string | null;
  noi_dung_can_dat?: string | null;
  khung_thoi_gian_ghi_chu?: string | null;
  chu_ky_goi_y?: ChuKyGoiY | null;
  nam: number;
  quy?: number | null;
  thang?: number | null;
  nguoi_chu_tri_id?: string | null;
  nguoi_phoi_hop_ids?: string[];
  han_hoan_thanh?: string | null;
  trang_thai?: NhiemVuTrangThai;
  thu_tu?: number;
}): Promise<{ id: string }> {
  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("edit");
  const actor = await getActorNhanSuId();
  const ten = input.ten.trim();
  if (!ten) throw new Error("Nhập tên nhiệm vụ.");
  if (!input.nam || input.nam < 2000) throw new Error("Năm nhiệm vụ không hợp lệ.");
  if (!input.nguoi_chu_tri_id && !input.id) throw new Error("Chọn người phụ trách.");
  if (!input.id && input.quy == null && input.thang == null && !input.han_hoan_thanh) {
    throw new Error("Nhập ít nhất Quý, Tháng hoặc Hạn thực hiện.");
  }

  if (input.nguoi_chu_tri_id) {
    await validateAssigneeForQlcv(supabase, input.nguoi_chu_tri_id, ksnkKhoaId);
  }
  const phoiHop = normalizeQlcvStaffIdList(input.nguoi_phoi_hop_ids);
  for (const sid of phoiHop) {
    await validateAssigneeForQlcv(supabase, sid, ksnkKhoaId);
  }

  const now = new Date().toISOString();
  const row = {
    ten,
    pham_vi_ap_dung: input.pham_vi_ap_dung?.trim() || null,
    chi_tieu: input.chi_tieu?.trim() || null,
    chi_dao: input.chi_dao?.trim() || null,
    bien_phap: input.bien_phap?.trim() || null,
    noi_dung_can_dat: input.noi_dung_can_dat?.trim() || null,
    khung_thoi_gian_ghi_chu: input.khung_thoi_gian_ghi_chu?.trim() || null,
    chu_ky_goi_y: input.chu_ky_goi_y || null,
    nam: input.nam,
    quy: input.quy ?? null,
    thang: input.thang ?? null,
    nguoi_chu_tri_id: input.nguoi_chu_tri_id || null,
    nguoi_phoi_hop_ids: phoiHop,
    han_hoan_thanh: input.han_hoan_thanh?.slice(0, 10) || null,
    trang_thai: input.trang_thai ?? "DANG_LAM",
    thu_tu: input.thu_tu ?? 0,
    updated_at: now,
    is_active: true,
  };

  if (input.id) {
    const { error } = await supabase.from(NV_TABLE).update(row).eq("id", input.id);
    if (error) throwQlcvDbError(error, "Không cập nhật nhiệm vụ.");
    revalidatePath("/quan-ly-cong-viec");
    return { id: input.id };
  }
  if (!actor) throw new Error("Tài khoản cần gắn hồ sơ nhân sự để tạo nhiệm vụ.");
  const { data, error } = await supabase
    .from(NV_TABLE)
    .insert({ ...row, nguoi_tao_id: actor, created_at: now })
    .select("id")
    .single();
  if (error) throwQlcvDbError(error, "Không tạo nhiệm vụ.");
  revalidatePath("/quan-ly-cong-viec");
  return { id: String(data.id) };
}

/** HUY nghiệp vụ (không xóa cứng). */
export async function huyNhiemVu(id: string): Promise<void> {
  const { supabase } = await ensureQlcvKsnkAccess("edit");
  const { error } = await supabase
    .from(NV_TABLE)
    .update({ trang_thai: "HUY", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throwQlcvDbError(error, "Không huỷ nhiệm vụ.");
  revalidatePath("/quan-ly-cong-viec");
}

/**
 * Xóa cứng chỉ khi không còn phiếu / mẫu định kỳ gắn.
 * Nếu còn ràng buộc → HUY.
 */
export async function deleteOrHuyNhiemVu(id: string): Promise<{ mode: "deleted" | "huy" }> {
  const { supabase } = await ensureQlcvKsnkAccess("edit");
  const [{ count: cvCount }, { count: dkCount }] = await Promise.all([
    supabase
      .from("qlcv_fact_cong_viec")
      .select("id", { count: "exact", head: true })
      .eq("nhiem_vu_id", id)
      .eq("is_active", true),
    supabase
      .from("qlcv_fact_cong_viec_dinh_ky")
      .select("id", { count: "exact", head: true })
      .eq("nhiem_vu_id", id)
      .eq("is_active", true),
  ]);
  if ((cvCount ?? 0) > 0 || (dkCount ?? 0) > 0) {
    await huyNhiemVu(id);
    return { mode: "huy" };
  }
  const { error } = await supabase.from(NV_TABLE).delete().eq("id", id);
  if (error) throwQlcvDbError(error, "Không xóa nhiệm vụ.");
  revalidatePath("/quan-ly-cong-viec");
  return { mode: "deleted" };
}

export type CongViecNhiemVuLite = {
  id: string;
  tieu_de: string;
  nguoi_phu_trach_ten: string | null;
  han_hoan_thanh: string | null;
  trang_thai: string;
  phan_tram_hoan_thanh: number;
};

export async function listCongViecByNhiemVu(nhiemVuId: string): Promise<CongViecNhiemVuLite[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  await resolveQlcvNhiemVuId(supabase, nhiemVuId);
  const { data, error } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id,tieu_de,nguoi_phu_trach_ten,han_hoan_thanh,trang_thai,phan_tram_hoan_thanh,is_active")
    .eq("nhiem_vu_id", nhiemVuId)
    .eq("is_active", true)
    .neq("trang_thai", "DA_HUY")
    .order("han_hoan_thanh", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) {
    console.error("[QLCV] listCongViecByNhiemVu", error);
    throw new Error(formatQlcvDbError(error.message || "Không tải việc con."));
  }
  return ((data || []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id),
    tieu_de: String(t.tieu_de ?? ""),
    nguoi_phu_trach_ten: (t.nguoi_phu_trach_ten as string) ?? null,
    han_hoan_thanh: t.han_hoan_thanh ? String(t.han_hoan_thanh).slice(0, 10) : null,
    trang_thai: String(t.trang_thai ?? ""),
    phan_tram_hoan_thanh: Number(t.phan_tram_hoan_thanh ?? 0),
  }));
}
