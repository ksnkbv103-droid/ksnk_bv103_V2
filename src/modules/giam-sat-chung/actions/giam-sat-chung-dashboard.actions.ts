"use server";

import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";

export type GscDashboardPayload = {
  tu_ngay: string;
  den_ngay: string;
  kpis: {
    tong_phien: number;
    diem_tb: number;
    dat_chuan_90: number;
    duoi_chuan_90: number;
    ty_le_dat_tieu_chi: number;
  };
  monthly: { ky: string; label: string; so_phien: number; diem_tb: number }[];
  by_loai_bang_kiem: { loai_bang_kiem: string; so_phien: number }[];
  by_khoa: { ten_khoa: string; so_phien: number }[];
  by_ket_qua: { ket_qua: string; so_luong: number }[];
};

type GscDashboardFilters = { khoa_id?: string; khoa_ids?: string[]; tu_ngay?: string; den_ngay?: string };

export async function getGscDashboardPayload(filters: GscDashboardFilters = {}) {
  const supabase = await createServerSupabaseUserClient();
  await verifyPermission("GIAM_SAT_CHUNG", "view");
  const scope = await getActorKsnkScope();

  const denStr = filters.den_ngay?.trim() || format(new Date(), "yyyy-MM-dd");
  let tuStr = filters.tu_ngay?.trim() || format(startOfMonth(subMonths(parseISO(denStr), 11)), "yyyy-MM-dd");
  if (parseISO(tuStr) > parseISO(denStr)) tuStr = format(startOfMonth(subMonths(parseISO(denStr), 11)), "yyyy-MM-dd");

  let sq = supabase
    .from("v_gsc_dashboard_rows")
    .select("session_id, khoa_id, loai_bang_kiem, tong_diem, ngay_giam_sat, created_at, ten_khoa, result_value")
    .gte("ngay_giam_sat", tuStr)
    .lte("ngay_giam_sat", denStr);
  if (scope.isMangLuoiKsnk) {
    // Mạng lưới chỉ xem dữ liệu theo khoa của chính họ.
    sq = scope.actorKhoaId ? sq.eq("khoa_id", scope.actorKhoaId) : sq.eq("khoa_id", "__EMPTY__");
  } else {
    const khoaIds = (filters.khoa_ids || []).map((x) => String(x || "").trim()).filter(Boolean);
    if (khoaIds.length > 0) sq = sq.in("khoa_id", khoaIds);
    else if (filters.khoa_id?.trim()) sq = sq.eq("khoa_id", filters.khoa_id.trim());
  }
  const { data: sessions, error: sErr } = await sq;
  if (sErr) return { success: false as const, error: sErr.message };
  const rows = (sessions || []) as Array<Record<string, unknown>>;
  const sessionMap = new Map<string, Record<string, unknown>>();
  const resultRows: Array<{ value?: string | null }> = [];
  for (const r of rows) {
    const sid = String(r.session_id || "");
    if (!sid) continue;
    if (!sessionMap.has(sid)) sessionMap.set(sid, r);
    resultRows.push({ value: (r.result_value as string | null) ?? null });
  }
  const sessionRows = Array.from(sessionMap.values());

  let sumDiem = 0;
  let datChuan90 = 0;
  const byLoaiMap = new Map<string, number>();
  const byKhoaMap = new Map<string, number>();
  const monthMap = new Map<string, { so_phien: number; tong_diem: number }>();
  for (const s of sessionRows) {
    const diem = Number(s.tong_diem || 0);
    if (Number.isFinite(diem)) sumDiem += diem;
    if (diem >= 90) datChuan90 += 1;
    const loai = String(s.loai_bang_kiem || "Khác");
    byLoaiMap.set(loai, (byLoaiMap.get(loai) || 0) + 1);
    const tenKhoa = String(s.ten_khoa || "—");
    byKhoaMap.set(tenKhoa, (byKhoaMap.get(tenKhoa) || 0) + 1);
    const raw = String(s.ngay_giam_sat || s.created_at || "").slice(0, 10);
    if (raw) {
      const ky = format(startOfMonth(parseISO(raw)), "yyyy-MM");
      const cur = monthMap.get(ky) || { so_phien: 0, tong_diem: 0 };
      cur.so_phien += 1;
      cur.tong_diem += Number.isFinite(diem) ? diem : 0;
      monthMap.set(ky, cur);
    }
  }

  let dat = 0;
  let khongDat = 0;
  for (const r of (resultRows || []) as Array<{ value?: string | null }>) {
    const v = String(r.value || "");
    if (v === "DAT") dat += 1;
    else if (v === "KHONG_DAT") khongDat += 1;
  }
  const tongCoDanhGia = dat + khongDat;

  const payload: GscDashboardPayload = {
    tu_ngay: tuStr,
    den_ngay: denStr,
    kpis: {
      tong_phien: sessionRows.length,
      diem_tb: sessionRows.length ? Math.round((sumDiem * 10) / sessionRows.length) / 10 : 0,
      dat_chuan_90: datChuan90,
      duoi_chuan_90: Math.max(0, sessionRows.length - datChuan90),
      ty_le_dat_tieu_chi: tongCoDanhGia ? Math.round((dat * 100) / tongCoDanhGia) : 0,
    },
    monthly: Array.from(monthMap.entries())
      .map(([ky, x]) => ({
        ky,
        label: ky.slice(5) + "/" + ky.slice(2, 4),
        so_phien: x.so_phien,
        diem_tb: x.so_phien ? Math.round((x.tong_diem * 10) / x.so_phien) / 10 : 0,
      }))
      .sort((a, b) => a.ky.localeCompare(b.ky)),
    by_loai_bang_kiem: Array.from(byLoaiMap.entries())
      .map(([loai_bang_kiem, so_phien]) => ({ loai_bang_kiem, so_phien }))
      .sort((a, b) => b.so_phien - a.so_phien),
    by_khoa: Array.from(byKhoaMap.entries())
      .map(([ten_khoa, so_phien]) => ({ ten_khoa, so_phien }))
      .sort((a, b) => b.so_phien - a.so_phien)
      .slice(0, 8),
    by_ket_qua: [
      { ket_qua: "Đạt", so_luong: dat },
      { ket_qua: "Không đạt", so_luong: khongDat },
    ],
  };
  return { success: true as const, data: payload };
}

