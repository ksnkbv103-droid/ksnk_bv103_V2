/**
 * Ngữ cảnh hành chính phiên giám sát (VST/GSC): auto-khoa mạng lưới,
 * «Tiếp tục giám sát», sticky sessionStorage — không đụng điểm/quan sát.
 */

import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";

export type SupervisionModuleKey = "vst" | "gsc";

export type SupervisionAdminContext = {
  khoa_id: string;
  khu_vuc_id: string;
  vi_tri: string;
  cach_thuc_id?: string;
  cach_thuc_giam_sat?: string;
};

export function resolveDefaultKhoaId(opts: {
  isMangLuoi: boolean;
  actorKhoaId: string | null | undefined;
  khoas: Array<{ id: string }>;
}): string {
  const actor = String(opts.actorKhoaId || "").trim();
  if (opts.isMangLuoi && actor) return actor;
  if (opts.khoas.length === 1) return String(opts.khoas[0]?.id || "").trim();
  return "";
}

export function pickAdminContext(session: Pick<
  GiamSatSession,
  "khoa_id" | "khu_vuc_id" | "vi_tri" | "cach_thuc_id" | "cach_thuc_giam_sat"
>): SupervisionAdminContext {
  return {
    khoa_id: String(session.khoa_id || "").trim(),
    khu_vuc_id: String(session.khu_vuc_id || "").trim(),
    vi_tri: String(session.vi_tri || "").trim(),
    cach_thuc_id: session.cach_thuc_id ? String(session.cach_thuc_id).trim() : undefined,
    cach_thuc_giam_sat: session.cach_thuc_giam_sat
      ? String(session.cach_thuc_giam_sat).trim()
      : undefined,
  };
}

/** Phiên mới: giữ hành chính; reset ngày/giờ; đối tượng tùy chọn. */
export function buildContinueAdminSession(
  prev: GiamSatSession,
  opts?: { keepSubjects?: boolean },
): GiamSatSession {
  const today = new Date().toISOString().split("T")[0]!;
  const keep = Boolean(opts?.keepSubjects);
  return {
    ...prev,
    khoa_id: String(prev.khoa_id || "").trim(),
    khu_vuc_id: String(prev.khu_vuc_id || "").trim(),
    vi_tri: String(prev.vi_tri || "").trim(),
    cach_thuc_id: prev.cach_thuc_id,
    cach_thuc_giam_sat: prev.cach_thuc_giam_sat,
    hinh_thuc_id: prev.hinh_thuc_id,
    hinh_thuc_giam_sat: prev.hinh_thuc_giam_sat,
    ngay_giam_sat: today,
    thoi_gian_bat_dau: "",
    thoi_gian_ket_thuc: "",
    ghi_chu_chung: "",
    ...(keep
      ? {}
      : {
          is_giam_sat_ca_nhan: false,
          nghe_nghiep_id: "",
          nhan_vien_id: "",
          is_manual_nhan_vien: false,
          ten_manual_nhan_vien: "",
          is_bo_sung_nguoi_benh: false,
          ma_nguoi_benh: "",
          ten_nguoi_benh: "",
          so_giuong_nguoi_benh: "",
        }),
  };
}

/** Đổi vị trí/khoa: xóa hành chính; mạng lưới vẫn giữ khoa phụ trách. */
export function buildFreshAdminSession(
  prev: GiamSatSession,
  opts?: { lockedKhoaId?: string | null },
): GiamSatSession {
  const today = new Date().toISOString().split("T")[0]!;
  const locked = String(opts?.lockedKhoaId || "").trim();
  return {
    ...prev,
    khoa_id: locked,
    khu_vuc_id: "",
    vi_tri: "",
    cach_thuc_id: undefined,
    cach_thuc_giam_sat: prev.cach_thuc_giam_sat,
    ngay_giam_sat: today,
    thoi_gian_bat_dau: "",
    thoi_gian_ket_thuc: "",
    ghi_chu_chung: "",
    is_giam_sat_ca_nhan: false,
    nghe_nghiep_id: "",
    nhan_vien_id: "",
    is_manual_nhan_vien: false,
    ten_manual_nhan_vien: "",
    is_bo_sung_nguoi_benh: false,
    ma_nguoi_benh: "",
    ten_nguoi_benh: "",
    so_giuong_nguoi_benh: "",
  };
}

export function stickyStorageKey(module: SupervisionModuleKey, hoSoId: string): string {
  return `ksnk.supervision.admin.${module}.${String(hoSoId || "").trim()}`;
}

export function readStickyAdminContext(
  module: SupervisionModuleKey,
  hoSoId: string,
): SupervisionAdminContext | null {
  if (typeof window === "undefined") return null;
  const id = String(hoSoId || "").trim();
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(stickyStorageKey(module, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupervisionAdminContext;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      khoa_id: String(parsed.khoa_id || "").trim(),
      khu_vuc_id: String(parsed.khu_vuc_id || "").trim(),
      vi_tri: String(parsed.vi_tri || "").trim(),
      cach_thuc_id: parsed.cach_thuc_id ? String(parsed.cach_thuc_id).trim() : undefined,
      cach_thuc_giam_sat: parsed.cach_thuc_giam_sat
        ? String(parsed.cach_thuc_giam_sat).trim()
        : undefined,
    };
  } catch {
    return null;
  }
}

export function writeStickyAdminContext(
  module: SupervisionModuleKey,
  hoSoId: string,
  ctx: SupervisionAdminContext,
): void {
  if (typeof window === "undefined") return;
  const id = String(hoSoId || "").trim();
  if (!id || !ctx.khoa_id) return;
  try {
    sessionStorage.setItem(stickyStorageKey(module, id), JSON.stringify(ctx));
  } catch {
    /* ignore quota */
  }
}

export function clearStickyAdminContext(module: SupervisionModuleKey, hoSoId: string): void {
  if (typeof window === "undefined") return;
  const id = String(hoSoId || "").trim();
  if (!id) return;
  try {
    sessionStorage.removeItem(stickyStorageKey(module, id));
  } catch {
    /* ignore */
  }
}

/** Prefill create: mạng lưới ưu tiên khoa phụ trách; sticky khu vực/vị trí chỉ khi cùng khoa. */
export function mergeStickyIntoSession(
  base: GiamSatSession,
  sticky: SupervisionAdminContext | null,
  opts: { isMangLuoi: boolean; actorKhoaId: string | null | undefined },
): GiamSatSession {
  if (!sticky) return base;
  const actor = String(opts.actorKhoaId || "").trim();
  if (opts.isMangLuoi) {
    const khoaId = actor || String(base.khoa_id || "").trim();
    if (!khoaId) return base;
    const sameKhoa = !sticky.khoa_id || sticky.khoa_id === khoaId;
    return {
      ...base,
      khoa_id: khoaId,
      khu_vuc_id: sameKhoa ? sticky.khu_vuc_id || base.khu_vuc_id : base.khu_vuc_id,
      vi_tri: sameKhoa ? sticky.vi_tri || base.vi_tri : base.vi_tri,
      cach_thuc_id: sameKhoa ? sticky.cach_thuc_id || base.cach_thuc_id : base.cach_thuc_id,
      cach_thuc_giam_sat: sameKhoa
        ? sticky.cach_thuc_giam_sat || base.cach_thuc_giam_sat
        : base.cach_thuc_giam_sat,
    };
  }
  return {
    ...base,
    khoa_id: sticky.khoa_id || base.khoa_id,
    khu_vuc_id: sticky.khu_vuc_id || base.khu_vuc_id,
    vi_tri: sticky.vi_tri || base.vi_tri,
    cach_thuc_id: sticky.cach_thuc_id || base.cach_thuc_id,
    cach_thuc_giam_sat: sticky.cach_thuc_giam_sat || base.cach_thuc_giam_sat,
  };
}
