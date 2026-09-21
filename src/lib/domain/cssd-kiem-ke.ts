/**
 * Domain SSOT — Kiểm kê dụng cụ CSSD (pure helpers).
 *
 * Display: so_luong_tong = kho_du_phong + Σ so_luong_thuc_te(trong bộ)
 *   → splitLoaiStock in cssd-loai-list-map.ts
 * Realtime set qty: so_luong_thuc_te = chi_tiet.so_luong + SUM(giao_dich.so_luong_thay_doi)
 *   → v_cssd_bo_dung_cu_chi_tiet_realtime
 *
 * Kiểm kê bộ: ledger KIEM_KE, delta = dem − thuc_te (skip 0; reject dem < 0).
 * Kiểm kê kho: set so_luong_kho_du_phong = dem_kho + audit KIEM_KE (bo_dung_cu_id null).
 *
 * Luân chuyển kho↔bộ / bộ↔bộ: giữ tong loại. Hỏng/Mất: giảm tong (qua /cssd-su-co).
 */

export const KIEM_KE_LOAI_GIAO_DICH = "KIEM_KE" as const;

export type KiemKeBoLineInput = {
  loaiDungCuId: string;
  /** Số đếm thực tế do NV nhập. */
  dem: number;
  /** so_luong_thuc_te hiện tại (view realtime). */
  thucTeHienTai: number;
};

export type KiemKeKhoLineInput = {
  loaiDungCuId: string;
  demKho: number;
  khoCu: number;
};

export type KiemKeDeltaLine = {
  loaiDungCuId: string;
  dem: number;
  baseline: number;
  soLuongThayDoi: number;
};

export function validateDemNonNegative(dem: number): string | null {
  if (!Number.isFinite(dem) || dem < 0) return "Số đếm không được âm.";
  if (!Number.isInteger(dem)) return "Số đếm phải là số nguyên.";
  return null;
}

/** Delta kiểm kê bộ: dem − thuc_te. Skip zero; reject dem < 0. */
export function buildKiemKeBoDeltas(lines: KiemKeBoLineInput[]):
  | { ok: true; deltas: KiemKeDeltaLine[] }
  | { ok: false; error: string } {
  const deltas: KiemKeDeltaLine[] = [];
  for (const line of lines) {
    const loaiId = String(line.loaiDungCuId || "").trim();
    if (!loaiId) return { ok: false, error: "Thiếu loại dụng cụ trên dòng kiểm kê bộ." };
    const dem = Number(line.dem);
    const err = validateDemNonNegative(dem);
    if (err) return { ok: false, error: err };
    const baseline = Math.max(0, Math.floor(Number(line.thucTeHienTai) || 0));
    const demInt = Math.floor(dem);
    const soLuongThayDoi = demInt - baseline;
    if (soLuongThayDoi === 0) continue;
    deltas.push({ loaiDungCuId: loaiId, dem: demInt, baseline, soLuongThayDoi });
  }
  return { ok: true, deltas };
}

/** Delta kiểm kê kho: dem_kho − kho_cu. Skip zero; reject dem < 0. */
export function buildKiemKeKhoDeltas(lines: KiemKeKhoLineInput[]):
  | { ok: true; deltas: KiemKeDeltaLine[] }
  | { ok: false; error: string } {
  const deltas: KiemKeDeltaLine[] = [];
  for (const line of lines) {
    const loaiId = String(line.loaiDungCuId || "").trim();
    if (!loaiId) return { ok: false, error: "Thiếu loại dụng cụ trên dòng kiểm kê kho." };
    const dem = Number(line.demKho);
    const err = validateDemNonNegative(dem);
    if (err) return { ok: false, error: err };
    const baseline = Math.max(0, Math.floor(Number(line.khoCu) || 0));
    const demInt = Math.floor(dem);
    const soLuongThayDoi = demInt - baseline;
    if (soLuongThayDoi === 0) continue;
    deltas.push({ loaiDungCuId: loaiId, dem: demInt, baseline, soLuongThayDoi });
  }
  return { ok: true, deltas };
}

/** kho↔bộ: giảm kho Δ, tăng trong-bộ Δ → tong không đổi. */
export function preserveTongKhoToBo(args: {
  kho: number;
  trongBo: number;
  quantity: number;
}): { kho: number; trongBo: number; tong: number } {
  const q = Math.max(0, Math.floor(Number(args.quantity) || 0));
  const kho = Math.max(0, Math.floor(Number(args.kho) || 0)) - q;
  const trongBo = Math.max(0, Math.floor(Number(args.trongBo) || 0)) + q;
  return { kho, trongBo, tong: kho + trongBo };
}

/** bộ↔kho: tăng kho Δ, giảm trong-bộ Δ → tong không đổi. */
export function preserveTongBoToKho(args: {
  kho: number;
  trongBo: number;
  quantity: number;
}): { kho: number; trongBo: number; tong: number } {
  const q = Math.max(0, Math.floor(Number(args.quantity) || 0));
  const kho = Math.max(0, Math.floor(Number(args.kho) || 0)) + q;
  const trongBo = Math.max(0, Math.floor(Number(args.trongBo) || 0)) - q;
  return { kho, trongBo, tong: kho + trongBo };
}

/**
 * bộ↔bộ: cùng loại — trừ nguồn Δ, cộng đích Δ.
 * tong loại (kho + Σ bộ) không đổi vì kho đứng yên và net Σ bộ = 0.
 */
export function preserveTongBoToBo(args: {
  kho: number;
  trongBoNguon: number;
  trongBoDich: number;
  quantity: number;
}): { kho: number; trongBoNguon: number; trongBoDich: number; tong: number } {
  const q = Math.max(0, Math.floor(Number(args.quantity) || 0));
  const kho = Math.max(0, Math.floor(Number(args.kho) || 0));
  const trongBoNguon = Math.max(0, Math.floor(Number(args.trongBoNguon) || 0)) - q;
  const trongBoDich = Math.max(0, Math.floor(Number(args.trongBoDich) || 0)) + q;
  return {
    kho,
    trongBoNguon,
    trongBoDich,
    tong: kho + trongBoNguon + trongBoDich,
  };
}

/** Hỏng/Mất vật lý: giảm tong (chỉ trong bộ hoặc kho bị trừ). */
export function decreaseTongPhysicalLoss(args: {
  kho: number;
  trongBo: number;
  quantity: number;
  from: "bo" | "kho";
}): { kho: number; trongBo: number; tong: number } {
  const q = Math.max(0, Math.floor(Number(args.quantity) || 0));
  let kho = Math.max(0, Math.floor(Number(args.kho) || 0));
  let trongBo = Math.max(0, Math.floor(Number(args.trongBo) || 0));
  if (args.from === "bo") trongBo -= q;
  else kho -= q;
  return { kho, trongBo, tong: kho + trongBo };
}

/** Sau kiểm kê: nếu đang INVENTORY → về ACTIVE (enum đã có trên form MDM). */
export function resolveTrangThaiAfterKiemKe(current: string | null | undefined): string {
  const t = String(current || "").trim().toUpperCase();
  if (t === "INVENTORY") return "ACTIVE";
  return t || "ACTIVE";
}
