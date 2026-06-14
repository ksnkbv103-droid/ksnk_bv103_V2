"use server";

import { z } from "zod";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import type {
  BangKiemApDungSource,
  BkMucDo,
  TanSuatDanhGia,
} from "@/lib/domain/bang-kiem-ap-dung";
import {
  computePhienToiThieuTrongKy,
  describeNghiaVuChoKhoa,
  evaluateTanSuatTrongKy,
  formatTanSuatToiThieu,
  listBkTuGiamSatChoKhoa,
  normalizeApDungForSave,
  parseApDungJsonb,
} from "@/lib/domain/bang-kiem-ap-dung";
import { buildTgsHitSet } from "@/lib/analytics/tgs-coverage-mappers";
import { gscFormHrefForLoaiGiamSat } from "@/modules/giam-sat-chung/lib/gsc-app-paths";

const inputSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  khoa_id: z.string().uuid().optional(),
});

export type BangKiemToiPhaiTgsRow = {
  id: string;
  ma_bk: string;
  ten_bang_kiem: string;
  muc_do: BkMucDo;
  loai_giam_sat: string | null;
  trang_thai: "da_tgs" | "thieu_tgs";
  tan_suat_label: string | null;
  so_phien_thuc_te: number;
  so_phien_toi_thieu: number | null;
  tan_suat_danh_gia: TanSuatDanhGia;
  huong_dan: string[];
  gsc_form_href: string;
};

export type BangKiemToiPhaiTgsPayload = {
  khoa: { id: string; ma_khoa: string | null; ten_khoa: string; label: string };
  tu_ngay: string;
  den_ngay: string;
  bat_buoc: BangKiemToiPhaiTgsRow[];
  khuyen_ngh: BangKiemToiPhaiTgsRow[];
  tom_tat: {
    tong_bat_buoc: number;
    da_tgs: number;
    thieu: number;
    ty_le_bao_phu: number;
  };
};

export async function getBangKiemToiPhaiTgsAction(
  input: z.infer<typeof inputSchema>,
): Promise<{ success: true; data: BangKiemToiPhaiTgsPayload } | { success: false; error: string }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const supabase = await createServerSupabaseUserClient();
    const scope = await getActorKsnkScope();

    let khoaId: string | null = null;
    const mangLuoiOnly =
      scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk;

    if (mangLuoiOnly) {
      khoaId = scope.actorKhoaId;
      if (!khoaId) {
        return {
          success: false,
          error: "Tài khoản mạng lưới KSNK chưa gắn khoa — liên hệ quản trị để được phân công.",
        };
      }
    } else {
      khoaId = parsed.data.khoa_id ?? scope.actorKhoaId ?? null;
      if (!khoaId) {
        return { success: false, error: "Chọn khoa để xem bảng kiểm bạn phải tự giám sát." };
      }
    }

    const { data: khoaRow, error: khoaErr } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ma_khoa, ten_khoa, khoi_id, is_active")
      .eq("id", khoaId)
      .maybeSingle();
    if (khoaErr) return { success: false, error: khoaErr.message };
    if (!khoaRow || khoaRow.is_active === false) {
      return { success: false, error: "Không tìm thấy khoa hoặc khoa đã ngừng hoạt động." };
    }

    const khoaCtx = {
      id: String(khoaRow.id),
      khoi_id: khoaRow.khoi_id ? String(khoaRow.khoi_id) : null,
      ma_khoa: khoaRow.ma_khoa as string | null,
      ten_khoa: String(khoaRow.ten_khoa ?? ""),
      is_active: true,
    };

    const { data: catalogRows, error: catErr } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("id, ma_bk, ten_bang_kiem, is_active, phan_loai_chuyen_mon, loai_giam_sat, ap_dung_jsonb")
      .eq("is_active", true)
      .order("ma_bk");
    if (catErr) return { success: false, error: catErr.message };

    const catalog = catalogRows ?? [];
    const mine = listBkTuGiamSatChoKhoa(catalog, khoaCtx);

    const { data: hitRows, error: hitErr } = await supabase
      .from("gstt_fact_gsc_dashboard_summary")
      .select("khoa_id, bang_kiem_id, session_id")
      .eq("stype", "TU_GIAM_SAT")
      .eq("khoa_id", khoaId)
      .gte("ngay_giam_sat", parsed.data.tu_ngay)
      .lte("ngay_giam_sat", parsed.data.den_ngay);
    if (hitErr) return { success: false, error: hitErr.message };

    const hitSet = buildTgsHitSet((hitRows ?? []) as { khoa_id: string; bang_kiem_id: string }[]);
    const sessionCountByBk = new Map<string, number>();
    for (const row of hitRows ?? []) {
      const bkKey = String((row as { bang_kiem_id: string }).bang_kiem_id);
      sessionCountByBk.set(bkKey, (sessionCountByBk.get(bkKey) ?? 0) + 1);
    }

    const toRow = (bk: BangKiemApDungSource): BangKiemToiPhaiTgsRow => {
      const ap = normalizeApDungForSave(parseApDungJsonb(bk.ap_dung_jsonb, bk));
      const nghiaVu = describeNghiaVuChoKhoa(ap, khoaCtx, bk);
      const daTgs = hitSet.has(`${khoaId}|${bk.id}`);
      const soPhienThucTe = sessionCountByBk.get(String(bk.id)) ?? 0;
      const ts = ap.tan_suat_toi_thieu;
      const soPhienToiThieu = ts
        ? computePhienToiThieuTrongKy(ts, parsed.data.tu_ngay, parsed.data.den_ngay)
        : null;
      const tanSuatDanhGia = evaluateTanSuatTrongKy(
        soPhienThucTe,
        ap,
        parsed.data.tu_ngay,
        parsed.data.den_ngay,
      );
      return {
        id: String(bk.id),
        ma_bk: String(bk.ma_bk ?? ""),
        ten_bang_kiem: String(bk.ten_bang_kiem ?? ""),
        muc_do: ap.muc_do,
        loai_giam_sat: (bk.loai_giam_sat as string | null) ?? null,
        trang_thai: daTgs ? "da_tgs" : "thieu_tgs",
        tan_suat_label: formatTanSuatToiThieu(ap),
        so_phien_thuc_te: soPhienThucTe,
        so_phien_toi_thieu: soPhienToiThieu,
        tan_suat_danh_gia: tanSuatDanhGia,
        huong_dan: nghiaVu.huongDan,
        gsc_form_href: gscFormHrefForLoaiGiamSat(bk.loai_giam_sat as string),
      };
    };

    const batBuoc = mine.filter((bk) => parseApDungJsonb(bk.ap_dung_jsonb, bk).muc_do === "BAT_BUOC").map(toRow);
    const khuyenNgh = mine
      .filter((bk) => parseApDungJsonb(bk.ap_dung_jsonb, bk).muc_do === "KHUYEN_NGH")
      .map(toRow);

    const daTgs = batBuoc.filter((r) => r.trang_thai === "da_tgs").length;
    const tong = batBuoc.length;
    const thieu = tong - daTgs;

    const label = khoaCtx.ma_khoa
      ? `[${khoaCtx.ma_khoa}] ${khoaCtx.ten_khoa}`
      : khoaCtx.ten_khoa;

    return {
      success: true,
      data: {
        khoa: {
          id: khoaCtx.id,
          ma_khoa: khoaCtx.ma_khoa,
          ten_khoa: khoaCtx.ten_khoa,
          label,
        },
        tu_ngay: parsed.data.tu_ngay,
        den_ngay: parsed.data.den_ngay,
        bat_buoc: batBuoc,
        khuyen_ngh: khuyenNgh,
        tom_tat: {
          tong_bat_buoc: tong,
          da_tgs: daTgs,
          thieu,
          ty_le_bao_phu: tong > 0 ? Math.round((daTgs / tong) * 1000) / 10 : 100,
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Không tải được danh sách BK phải TGS",
    };
  }
}
