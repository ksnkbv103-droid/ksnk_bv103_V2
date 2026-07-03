import type { SupabaseClient } from "@supabase/supabase-js";

/** Một dòng trong cột `nhat_ky jsonb` trên `qlcv_fact_cong_viec`. */
export type QlcvNhatKyEntry = {
  id?: string;
  loai_hoat_dong: string;
  nguoi_thuc_hien_id?: string | null;
  trang_thai?: string | null;
  noi_dung?: string | null;
  phan_tram_hoan_thanh?: number | null;
  created_at?: string;
};

export async function appendQlcvNhatKy(
  supabase: SupabaseClient,
  params: {
    congViecId: string;
    loaiHoatDong: string;
    nguoiThucHienId?: string | null;
    noiDung?: string | null;
    trangThai?: string | null;
    phanTramHoanThanh?: number | null;
  },
): Promise<QlcvNhatKyEntry> {
  const { data, error } = await supabase.rpc("fn_qlcv_append_nhat_ky", {
    p_cong_viec_id: params.congViecId,
    p_loai_hoat_dong: params.loaiHoatDong,
    p_nguoi_thuc_hien_id: params.nguoiThucHienId ?? null,
    p_noi_dung: params.noiDung ?? null,
    p_trang_thai: params.trangThai ?? null,
    p_phan_tram_hoan_thanh: params.phanTramHoanThanh ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as QlcvNhatKyEntry;
}

export function parseQlcvNhatKy(raw: unknown): QlcvNhatKyEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw as QlcvNhatKyEntry[];
}

export async function enrichQlcvNhatKyForTimeline(
  supabase: SupabaseClient,
  entries: QlcvNhatKyEntry[],
): Promise<
  Array<
    QlcvNhatKyEntry & {
      nguoi?: { ho_ten: string | null } | null;
    }
  >
> {
  const ids = [...new Set(entries.map((e) => e.nguoi_thuc_hien_id).filter(Boolean))] as string[];
  const nameMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("mdm_nhan_su").select("id, ho_ten").in("id", ids);
    for (const row of data ?? []) {
      nameMap.set(String(row.id), String(row.ho_ten ?? ""));
    }
  }

  return entries
    .slice()
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((e) => ({
      ...e,
      nguoi: e.nguoi_thuc_hien_id
        ? { ho_ten: nameMap.get(String(e.nguoi_thuc_hien_id)) ?? null }
        : null,
    }));
}
