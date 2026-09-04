/** Phiếu sự cố dụng cụ theo bộ — một chứng từ, nhiều dòng thành phần. */

export const SET_RECONCILE_TYPE_ID = "INSTRUMENT_SET_RECONCILE" as const;
/** Một cửa form Chuyển — nộp thành TRANSFER hoặc REPLENISH theo cặp khung. */
export const INSTRUMENT_MOVE_TYPE_ID = "INSTRUMENT_MOVE" as const;
export const SET_RECONCILE_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

export const SET_RECONCILE_LINE_KINDS = [
  "KHOP",
  "HONG",
  "MAT",
  "BO_SUNG",
  "TRA_KHO",
  "DOI_CHUAN",
  "DOI_LOAI",
  "DIEU_CHUYEN",
  "THEM_DONG",
  "XOA_DONG",
] as const;

export type SetReconcileLineKind = (typeof SET_RECONCILE_LINE_KINDS)[number];

export const SET_RECONCILE_KIND_LABEL: Record<SetReconcileLineKind, string> = {
  KHOP: "Khớp",
  HONG: "Hỏng",
  MAT: "Mất",
  BO_SUNG: "Bổ sung",
  TRA_KHO: "Trả kho",
  DOI_CHUAN: "Đổi số lượng chuẩn",
  DOI_LOAI: "Đổi mã / tên loại",
  DIEU_CHUYEN: "Điều chuyển",
  THEM_DONG: "Thêm vào bộ",
  XOA_DONG: "Xóa khỏi bộ",
};

/** Lấy kho / trả kho / điều chuyển — chỉ cửa Chuyển, không gửi trên phiếu rà soát. */
export const SET_RECONCILE_MOVE_ONLY_KINDS = ["BO_SUNG", "TRA_KHO", "DIEU_CHUYEN"] as const;
export type SetReconcileMoveOnlyKind = (typeof SET_RECONCILE_MOVE_ONLY_KINDS)[number];

export const SET_RECONCILE_MOVE_ONLY_MESSAGE =
  "Lấy kho, trả kho và điều chuyển không dùng cửa Rà soát — mở tab Chuyển.";

export type SetReconcileLineInput = {
  chiTietId?: string;
  loaiDungCuId?: string;
  maLoai?: string;
  tenDungCuLe: string;
  soLuongChuan: number;
  soLuongThucTe: number;
  soLuongDem: number;
  soLuongChuanDeXuat?: number;
  loaiDungCuIdDeXuat?: string;
  maLoaiDeXuat?: string;
  tenDungCuLeDeXuat?: string;
  maKhac?: string;
  maKhacGoc?: string;
  maQrDen?: string;
  kind: SetReconcileLineKind;
  note?: string;
};

export function formatLoaiDungCuLabel(ma?: string | null, ten?: string | null): string {
  const m = String(ma || "").trim();
  const t = String(ten || "").trim();
  if (m && t) return `${m} — ${t}`;
  return t || m || "—";
}

export function normalizeMaLoaiDeXuat(raw?: string | null): string {
  return String(raw || "").trim().toUpperCase();
}

export function doiLoaiIsRelink(line: SetReconcileLineInput): boolean {
  const nextId = String(line.loaiDungCuIdDeXuat || "").trim();
  const curId = String(line.loaiDungCuId || "").trim();
  return Boolean(nextId) && nextId !== curId;
}

/** Đổi mã gốc danh mục (cùng loại, mã mới). */
export function doiLoaiIsCatalogRename(line: SetReconcileLineInput): boolean {
  const next = normalizeMaLoaiDeXuat(line.maLoaiDeXuat);
  const cur = normalizeMaLoaiDeXuat(line.maLoai);
  return Boolean(next) && next !== cur && !doiLoaiIsRelink(line);
}

/** Đổi tên loại trên cùng mã (cửa Đổi danh mục). */
export function doiLoaiIsTenChange(line: SetReconcileLineInput): boolean {
  const next = String(line.tenDungCuLeDeXuat || "").trim();
  const cur = String(line.tenDungCuLe || "").trim();
  return Boolean(next) && next !== cur && !doiLoaiIsRelink(line);
}

export function doiLoaiHasCatalogEdit(line: SetReconcileLineInput): boolean {
  return doiLoaiIsRelink(line) || doiLoaiIsCatalogRename(line) || doiLoaiIsTenChange(line);
}

export type SetReconcileStatus = "DRAFT" | "NONE" | "BOM_PENDING" | "BOM_APPROVED" | "BOM_REJECTED";

/** Sự cố vật lý trên phiếu rà soát — chỉ Hỏng/Mất; không gồm lấy kho / trả kho / điều chuyển. */
export function isPhysicalKind(kind: SetReconcileLineKind): boolean {
  return kind === "HONG" || kind === "MAT";
}

export function isMoveOnlyKind(kind: SetReconcileLineKind): boolean {
  return kind === "BO_SUNG" || kind === "TRA_KHO" || kind === "DIEU_CHUYEN";
}

export function isCatalogChangeKind(kind: SetReconcileLineKind): boolean {
  return kind === "DOI_CHUAN" || kind === "DOI_LOAI" || kind === "THEM_DONG" || kind === "XOA_DONG";
}

export function rejectMoveOnlyKindsOnReconcile(lines: SetReconcileLineInput[]): string | null {
  if (lines.some((l) => isMoveOnlyKind(l.kind))) return SET_RECONCILE_MOVE_ONLY_MESSAGE;
  return null;
}

export function isInstrumentMoveTypeId(typeId?: string | null): boolean {
  const id = String(typeId || "").trim();
  return (
    id === INSTRUMENT_MOVE_TYPE_ID ||
    id === "INSTRUMENT_TRANSFER" ||
    id === "INSTRUMENT_REPLENISH"
  );
}

export function isSetReconcileDoorTypeId(typeId?: string | null): boolean {
  const id = String(typeId || "").trim();
  return !id || id === SET_RECONCILE_TYPE_ID || id === "INSTRUMENT_BROKEN" || id === "INSTRUMENT_MISSING";
}

export function physicalTypeIdForKind(kind: SetReconcileLineKind): string | null {
  if (kind === "HONG") return "INSTRUMENT_BROKEN";
  if (kind === "MAT") return "INSTRUMENT_MISSING";
  if (kind === "BO_SUNG") return "INSTRUMENT_REPLENISH";
  if (kind === "TRA_KHO") return "INSTRUMENT_RETURN_KHO";
  if (kind === "DIEU_CHUYEN") return "INSTRUMENT_TRANSFER";
  return null;
}

export function physicalQuantity(line: SetReconcileLineInput): number {
  if (line.kind === "HONG" || line.kind === "MAT" || line.kind === "DIEU_CHUYEN" || line.kind === "TRA_KHO") {
    return Math.max(0, Math.floor(line.soLuongThucTe) - Math.floor(line.soLuongDem));
  }
  if (line.kind === "BO_SUNG") {
    return Math.max(0, Math.floor(line.soLuongDem) - Math.floor(line.soLuongThucTe));
  }
  return 0;
}

export function typedMaLoai(line: SetReconcileLineInput): string {
  return normalizeMaLoaiDeXuat(line.maLoaiDeXuat || line.maLoai);
}

export function isMaLoaiChanged(line: SetReconcileLineInput): boolean {
  const next = typedMaLoai(line);
  const cur = normalizeMaLoaiDeXuat(line.maLoai);
  return Boolean(next) && Boolean(cur) && next !== cur;
}

export function normalizeMaBo(raw?: string | null): string {
  return String(raw || "")
    .trim()
    .toUpperCase();
}

export function lookupByNormalizedCode<T>(
  code: string,
  options: T[],
  getCode: (row: T) => string,
): T | undefined {
  const n = normalizeMaLoaiDeXuat(code);
  if (!n) return undefined;
  const exact = options.filter((o) => normalizeMaLoaiDeXuat(getCode(o)) === n);
  if (exact.length >= 1) return exact[0];
  const prefix = options.filter((o) => normalizeMaLoaiDeXuat(getCode(o)).startsWith(n));
  return prefix.length === 1 ? prefix[0] : undefined;
}

/** Dò loại dụng cụ theo mã gõ: khớp đúng trước, rồi một prefix duy nhất. */
export function lookupLoaiByMa<T extends { ma: string }>(
  code: string,
  options: T[],
): T | undefined {
  return lookupByNormalizedCode(code, options, (o) => o.ma);
}

/** Dò loại theo mã khắc (mã viện khắc trên món) — khớp đúng hoặc một prefix duy nhất. */
export function lookupLoaiByMaKhac<T extends { maKhac: string }>(
  code: string,
  rows: T[],
): T | undefined {
  return lookupByNormalizedCode(code, rows, (o) => o.maKhac);
}

/** Dò loại khi gõ ô mã khắc: mã khắc/mã chi tiết trước, rồi mã loại danh mục. */
export function lookupLoaiForKhacField<T extends { ma: string }>(
  code: string,
  loaiOptions: T[],
  khacIndex: Array<T & { maKhac: string }>,
): T | undefined {
  return lookupLoaiByMaKhac(code, khacIndex) || lookupLoaiByMa(code, loaiOptions);
}

/** Dòng đã gắn loại trên bộ, hoặc gõ mã trùng danh mục. */
export function isReconcileCatalogMatched<T extends { id?: string; ma: string }>(
  line: SetReconcileLineInput,
  loaiOptions: T[],
  khacIndex: Array<T & { maKhac: string }>,
): boolean {
  if (String(line.loaiDungCuId || "").trim()) return true;
  if (String(line.loaiDungCuIdDeXuat || "").trim()) return true;
  return Boolean(
    lookupLoaiByMa(typedMaLoai(line), loaiOptions) ||
      lookupLoaiForKhacField(String(line.maKhac || ""), loaiOptions, khacIndex),
  );
}

/** Gộp mã khắc đã lưu (không trùng) — phục vụ dropdown. */
export function uniqueKhacCatalog<T extends { maKhac: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const code = normalizeMaLoaiDeXuat(row.maKhac);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(row);
  }
  return out;
}

export type KhacPickerOption = {
  id: string;
  label: string;
  keywords: string[];
  groupLabel: string;
};

/** Dropdown mã khắc: mã đã khắc/chi tiết trước, rồi mã loại danh mục (để nhập thêm). */
export function buildKhacPickerOptions(
  khacIndex: Array<{ maKhac: string; ma: string; ten: string }>,
  loaiOptions: Array<{ ma: string; ten: string }>,
): KhacPickerOption[] {
  const seen = new Set<string>();
  const out: KhacPickerOption[] = [];
  for (const row of uniqueKhacCatalog(khacIndex)) {
    const id = normalizeMaLoaiDeXuat(row.maKhac);
    if (!id) continue;
    seen.add(id);
    out.push({
      id,
      label: formatLoaiDungCuLabel(id, row.ten),
      keywords: [id, row.ma, row.ten],
      groupLabel: "Mã khắc đã có",
    });
  }
  for (const loai of loaiOptions) {
    const id = normalizeMaLoaiDeXuat(loai.ma);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: formatLoaiDungCuLabel(id, loai.ten),
      keywords: [id, loai.ten],
      groupLabel: "Danh mục loại dụng cụ",
    });
  }
  return out;
}

/**
 * Tự gán loại lệch khi kiểm kê:
 * bộ đích → điều chuyển; tăng đếm → bổ sung; giảm đếm → giữ Hỏng/Mất (UI chọn);
 * đổi mã loại → sai mã.
 */
export function applySetReconcileLineInference(line: SetReconcileLineInput): SetReconcileLineInput {
  if (line.kind === "THEM_DONG" || line.kind === "XOA_DONG" || line.kind === "DOI_CHUAN") {
    return line;
  }
  const dest = normalizeMaBo(line.maQrDen);
  const dem = Math.floor(Number(line.soLuongDem) || 0);
  const thuc = Math.floor(Number(line.soLuongThucTe) || 0);
  const next: SetReconcileLineInput = { ...line };
  if (isMaLoaiChanged(next)) {
    next.maLoaiDeXuat = typedMaLoai(next);
  }
  if (dest) {
    next.kind = "DIEU_CHUYEN";
    return next;
  }
  if (dem > thuc) {
    next.kind = "BO_SUNG";
    return next;
  }
  if (dem < thuc) {
    if (next.kind !== "HONG" && next.kind !== "MAT") next.kind = "KHOP";
    return next;
  }
  if (isMaLoaiChanged(next)) {
    next.kind = "DOI_LOAI";
    return next;
  }
  next.kind = "KHOP";
  return next;
}

export function needsBomApproval(lines: SetReconcileLineInput[]): boolean {
  return lines.some((l) => isCatalogChangeKind(l.kind));
}

export type TransferSourceRow = {
  chiTietId?: string;
  loaiDungCuId?: string;
  maLoai?: string;
  tenDungCuLe: string;
  soLuongChuan: number;
  soLuongThucTe: number;
};

export type TransferMoveQty = { chiTietId: string; qty: number };

export type ReplenishAddQty = {
  loaiDungCuId: string;
  maLoai?: string;
  tenDungCuLe: string;
  qty: number;
};

export type KhoStockLookup = { id: string; soLuongKho?: number };

export type CanKhoDirection = "LAY_KHO" | "TRA_KHO";

export type CanKhoPrefill = {
  maBo: string;
  direction: CanKhoDirection;
  moves: ReplenishAddQty[];
};

/** Dương = thiếu (lấy kho); âm = thừa (trả kho). Mốc: số hệ thống vs số chuẩn. */
export function lechVsChuan(
  line: Pick<SetReconcileLineInput, "soLuongChuan" | "soLuongThucTe">,
): number {
  return Math.floor(Number(line.soLuongChuan) || 0) - Math.floor(Number(line.soLuongThucTe) || 0);
}

export function formatLechVsChuan(lech: number): string {
  if (lech > 0) return `Thiếu ${lech}`;
  if (lech < 0) return `Thừa ${-lech}`;
  return "Khớp chuẩn";
}

export function reconcileLineKey(line: Pick<SetReconcileLineInput, "chiTietId">, index: number): string {
  return String(line.chiTietId || "").trim() || `new-${index}`;
}

export function isCanKhoEligibleLine(line: SetReconcileLineInput): boolean {
  if (isCatalogChangeKind(line.kind) || line.kind === "HONG" || line.kind === "MAT") return false;
  if (!String(line.loaiDungCuId || "").trim()) return false;
  return lechVsChuan(line) !== 0;
}

export function canKhoLineKeys(lines: SetReconcileLineInput[]): string[] {
  return lines.flatMap((line, i) => (isCanKhoEligibleLine(line) ? [reconcileLineKey(line, i)] : []));
}

export function khoStockOf(loaiId: string, khoStock: KhoStockLookup[]): number {
  const id = String(loaiId || "").trim();
  if (!id) return 0;
  const hit = khoStock.find((k) => k.id === id);
  return Math.max(0, Math.floor(Number(hit?.soLuongKho) || 0));
}

export function clampSignedKhoMove(
  qty: number,
  loaiId: string,
  thucTe: number,
  khoStock: KhoStockLookup[],
): number {
  const n = Math.floor(Number(qty) || 0);
  if (n > 0) return Math.min(n, khoStockOf(loaiId, khoStock));
  if (n < 0) return -Math.min(-n, Math.max(0, Math.floor(Number(thucTe) || 0)));
  return 0;
}

function mergeReplenishMoves(moves: ReplenishAddQty[]): ReplenishAddQty[] {
  const byLoai = new Map<string, ReplenishAddQty>();
  for (const move of moves) {
    const id = String(move.loaiDungCuId || "").trim();
    if (!id || !Math.floor(Number(move.qty) || 0)) continue;
    const prev = byLoai.get(id);
    byLoai.set(id, {
      loaiDungCuId: id,
      maLoai: move.maLoai || prev?.maLoai,
      tenDungCuLe: move.tenDungCuLe || prev?.tenDungCuLe || "",
      qty: (prev?.qty || 0) + Math.floor(Number(move.qty) || 0),
    });
  }
  return [...byLoai.values()];
}

/** Rà soát → cửa Chuyển: chỉ dòng đã chọn, lệch đúng hướng, không vượt tồn / số gắn bộ. */
export function buildCanKhoPrefill(params: {
  maBo: string;
  direction: CanKhoDirection;
  lines: SetReconcileLineInput[];
  selectedKeys: string[];
  khoStock: KhoStockLookup[];
}): { prefill: CanKhoPrefill | null; error: string | null } {
  const maBo = normalizeMaBo(params.maBo);
  if (!maBo) return { prefill: null, error: "Chưa chọn bộ." };
  if (!params.selectedKeys.length) return { prefill: null, error: "Chọn dụng cụ cần cân kho." };

  const keySet = new Set(params.selectedKeys);
  const picked = params.lines.filter((line, i) => keySet.has(reconcileLineKey(line, i)));
  if (!picked.length) return { prefill: null, error: "Chọn dụng cụ cần cân kho." };

  const wantLay = params.direction === "LAY_KHO";
  const matching = picked.filter((line) => {
    if (!isCanKhoEligibleLine(line)) return false;
    const lech = lechVsChuan(line);
    return wantLay ? lech > 0 : lech < 0;
  });
  if (!matching.length) {
    return {
      prefill: null,
      error: wantLay ? "Dòng đã chọn không thiếu so với chuẩn." : "Dòng đã chọn không thừa so với chuẩn.",
    };
  }

  const thucByLoai = new Map<string, number>();
  for (const line of matching) {
    const id = String(line.loaiDungCuId || "").trim();
    thucByLoai.set(id, (thucByLoai.get(id) || 0) + Math.floor(Number(line.soLuongThucTe) || 0));
  }
  const moves = mergeReplenishMoves(
    matching.map((line) => ({
      loaiDungCuId: String(line.loaiDungCuId),
      maLoai: line.maLoai,
      tenDungCuLe: line.tenDungCuLe,
      qty: lechVsChuan(line),
    })),
  )
    .map((move) => ({
      ...move,
      qty: clampSignedKhoMove(move.qty, move.loaiDungCuId, thucByLoai.get(move.loaiDungCuId) || 0, params.khoStock),
    }))
    .filter((move) => move.qty !== 0);

  if (!moves.length) {
    return {
      prefill: null,
      error: wantLay ? "Không đủ tồn kho cho dòng đã chọn." : "Không trả được kho (số gắn bộ = 0).",
    };
  }
  return { prefill: { maBo, direction: params.direction, moves }, error: null };
}

export function fillLechVsChuanDelta(
  destRows: TransferSourceRow[],
  khoStock: KhoStockLookup[],
): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const row of destRows) {
    const loaiId = String(row.loaiDungCuId || "").trim();
    if (!loaiId) continue;
    const qty = clampSignedKhoMove(lechVsChuan(row), loaiId, row.soLuongThucTe, khoStock);
    if (qty !== 0) delta[loaiId] = (delta[loaiId] || 0) + qty;
  }
  return delta;
}

export function applyCanKhoPrefillDelta(
  moves: ReplenishAddQty[],
  destRows: TransferSourceRow[],
  khoStock: KhoStockLookup[],
): Record<string, number> {
  const thucByLoai = new Map<string, number>();
  for (const row of destRows) {
    const id = String(row.loaiDungCuId || "").trim();
    if (!id) continue;
    thucByLoai.set(id, (thucByLoai.get(id) || 0) + Math.floor(Number(row.soLuongThucTe) || 0));
  }
  const delta: Record<string, number> = {};
  for (const move of mergeReplenishMoves(moves)) {
    const qty = clampSignedKhoMove(
      move.qty,
      move.loaiDungCuId,
      thucByLoai.get(move.loaiDungCuId) || 0,
      khoStock,
    );
    if (qty !== 0) delta[move.loaiDungCuId] = qty;
  }
  return delta;
}

export function rowShowsLechMove(
  row: Pick<TransferSourceRow, "loaiDungCuId" | "soLuongChuan" | "soLuongThucTe">,
  delta: Record<string, number>,
): boolean {
  const id = String(row.loaiDungCuId || "");
  return lechVsChuan(row) !== 0 || (delta[id] || 0) !== 0;
}

export function remainingAfterMove(thucTe: number, moved: number): number {
  return Math.max(0, Math.floor(thucTe) - Math.max(0, Math.floor(moved)));
}

export type MoveSideKind = "kho" | "bo";

/** Chọn Kho một bên thì bên kia bắt buộc Bộ. Hai bên Bộ = điều chuyển. */
export function applyMoveSideChoice(
  left: MoveSideKind,
  right: MoveSideKind,
  side: "left" | "right",
  kind: MoveSideKind,
): { left: MoveSideKind; right: MoveSideKind } {
  if (kind === "kho") {
    return side === "left" ? { left: "kho", right: "bo" } : { left: "bo", right: "kho" };
  }
  return side === "left" ? { left: "bo", right } : { left, right: "bo" };
}

export function resolveInstrumentMoveSubmitTypeId(
  lines: SetReconcileLineInput[],
): "INSTRUMENT_TRANSFER" | "INSTRUMENT_REPLENISH" | null {
  const dieuChuyen = lines.some((l) => l.kind === "DIEU_CHUYEN" && physicalQuantity(l) > 0);
  const kho = lines.some((l) => (l.kind === "BO_SUNG" || l.kind === "TRA_KHO") && physicalQuantity(l) > 0);
  if (dieuChuyen && kho) return null;
  if (dieuChuyen) return "INSTRUMENT_TRANSFER";
  if (kho) return "INSTRUMENT_REPLENISH";
  return null;
}

/** Ô số chuyển: chỉ giữ chữ số, không vượt tồn hiện có. Chuỗi rỗng khi đang xóa để gõ lại. */
export function clampTransferQtyInput(raw: string, available: number): string {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 4);
  const cap = Math.max(0, Math.floor(Number(available) || 0));
  if (digits === "") return "";
  const n = Math.floor(Number(digits));
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.min(n, cap));
}

/** Bộ nguồn → dòng phiếu điều chuyển (trừ nguồn, cộng đích qua maQrDen). */
export function buildTransferReconcileLines(
  source: TransferSourceRow[],
  moves: TransferMoveQty[],
  destMaBo: string,
): SetReconcileLineInput[] {
  const dest = normalizeMaBo(destMaBo);
  const qtyByChiTiet = new Map<string, number>();
  for (const move of moves) {
    const id = String(move.chiTietId || "").trim();
    if (!id) continue;
    qtyByChiTiet.set(id, (qtyByChiTiet.get(id) || 0) + Math.max(0, Math.floor(move.qty)));
  }
  return source.map((row) => {
    const id = String(row.chiTietId || "").trim();
    const moved = qtyByChiTiet.get(id) || 0;
    const thuc = Math.floor(Number(row.soLuongThucTe) || 0);
    const dem = remainingAfterMove(thuc, moved);
    return {
      chiTietId: row.chiTietId,
      loaiDungCuId: row.loaiDungCuId,
      maLoai: row.maLoai,
      tenDungCuLe: row.tenDungCuLe,
      soLuongChuan: Math.floor(Number(row.soLuongChuan) || 0),
      soLuongThucTe: thuc,
      soLuongDem: dem,
      kind: moved > 0 ? "DIEU_CHUYEN" : "KHOP",
      maQrDen: moved > 0 ? dest : undefined,
    };
  });
}

/** Kho ↔ bộ: qty > 0 kho→bộ; qty < 0 bộ→kho. */
export function buildKhoBoMoveLines(
  destItems: TransferSourceRow[],
  moves: ReplenishAddQty[],
): SetReconcileLineInput[] {
  const byLoai = new Map<string, ReplenishAddQty>();
  for (const move of moves) {
    const id = String(move.loaiDungCuId || "").trim();
    if (!id) continue;
    const qty = Math.floor(Number(move.qty) || 0);
    if (qty === 0) continue;
    const prev = byLoai.get(id);
    byLoai.set(id, {
      loaiDungCuId: id,
      maLoai: move.maLoai || prev?.maLoai,
      tenDungCuLe: move.tenDungCuLe || prev?.tenDungCuLe || "",
      qty: (prev?.qty || 0) + qty,
    });
  }
  const lines: SetReconcileLineInput[] = destItems.map((row) => {
    const loaiId = String(row.loaiDungCuId || "").trim();
    const move = byLoai.get(loaiId);
    if (move) byLoai.delete(loaiId);
    const thuc = Math.floor(Number(row.soLuongThucTe) || 0);
    const raw = move?.qty || 0;
    const qty = raw < 0 ? Math.max(-thuc, raw) : raw;
    return {
      chiTietId: row.chiTietId,
      loaiDungCuId: row.loaiDungCuId,
      maLoai: row.maLoai,
      tenDungCuLe: row.tenDungCuLe,
      soLuongChuan: Math.floor(Number(row.soLuongChuan) || 0),
      soLuongThucTe: thuc,
      soLuongDem: thuc + qty,
      kind: qty > 0 ? "BO_SUNG" : qty < 0 ? "TRA_KHO" : "KHOP",
    };
  });
  for (const move of byLoai.values()) {
    if (move.qty < 1) continue;
    lines.push({
      loaiDungCuId: move.loaiDungCuId,
      maLoai: move.maLoai,
      tenDungCuLe: move.tenDungCuLe,
      soLuongChuan: 0,
      soLuongThucTe: 0,
      soLuongDem: move.qty,
      kind: "BO_SUNG",
    });
  }
  return lines;
}

/** Kho lẻ → dòng phiếu bổ sung vào bộ đích. */
export function buildReplenishReconcileLines(
  destItems: TransferSourceRow[],
  adds: ReplenishAddQty[],
): SetReconcileLineInput[] {
  return buildKhoBoMoveLines(destItems, adds);
}

/** Rà soát một bộ: chỉ đổi danh mục hoặc Hỏng/Mất — không suy ra lấy kho / trả kho / điều chuyển. */
export function applyReconcileDoorInference(line: SetReconcileLineInput): SetReconcileLineInput {
  const next: SetReconcileLineInput = { ...line, maQrDen: undefined };
  if (next.kind === "THEM_DONG" || next.kind === "XOA_DONG" || next.kind === "HONG" || next.kind === "MAT") {
    return next;
  }
  if (isMaLoaiChanged(next)) {
    next.maLoaiDeXuat = typedMaLoai(next);
  }
  if (doiLoaiHasCatalogEdit(next) || isMaLoaiChanged(next)) {
    next.kind = "DOI_LOAI";
    if (!normalizeMaLoaiDeXuat(next.maLoaiDeXuat) && next.maLoai) {
      next.maLoaiDeXuat = normalizeMaLoaiDeXuat(next.maLoai);
    }
    return next;
  }
  const proposed = Math.floor(Number(next.soLuongChuanDeXuat ?? next.soLuongChuan) || 0);
  const current = Math.floor(Number(next.soLuongChuan) || 0);
  if (proposed >= 1 && proposed !== current) {
    next.kind = "DOI_CHUAN";
    next.soLuongChuanDeXuat = proposed;
    return next;
  }
  next.kind = "KHOP";
  return next;
}

export function validateInstrumentDoorLines(
  typeId: string,
  lines: SetReconcileLineInput[],
): string | null {
  if (typeId === SET_RECONCILE_TYPE_ID) {
    const moveErr = rejectMoveOnlyKindsOnReconcile(lines);
    if (moveErr) return moveErr;
    if (
      lines.some(
        (l) =>
          l.kind !== "THEM_DONG" &&
          l.kind !== "DOI_CHUAN" &&
          Math.floor(l.soLuongDem) > Math.floor(l.soLuongThucTe),
      )
    ) {
      return SET_RECONCILE_MOVE_ONLY_MESSAGE;
    }
  }
  const base = validateSetReconcileLines(lines);
  if (base) return base;
  if (typeId === INSTRUMENT_MOVE_TYPE_ID) {
    const dieuChuyen = lines.some((l) => l.kind === "DIEU_CHUYEN" && physicalQuantity(l) > 0);
    const kho = lines.some((l) => (l.kind === "BO_SUNG" || l.kind === "TRA_KHO") && physicalQuantity(l) > 0);
    if (dieuChuyen && kho) return "Một phiếu chỉ một cặp: hai bộ, hoặc kho với một bộ.";
    if (!dieuChuyen && !kho) return "Chọn kho hoặc bộ hai bên, rồi gõ số lượng để chuyển.";
    return null;
  }
  if (typeId === "INSTRUMENT_TRANSFER") {
    const moved = lines.some((l) => l.kind === "DIEU_CHUYEN" && physicalQuantity(l) > 0);
    if (!moved) return "Chọn loại dụng cụ và số lượng để chuyển từ bộ nguồn sang bộ đích.";
  }
  if (typeId === "INSTRUMENT_REPLENISH") {
    const moved = lines.some(
      (l) => (l.kind === "BO_SUNG" || l.kind === "TRA_KHO") && physicalQuantity(l) > 0,
    );
    if (!moved) return "Gõ số lượng rồi bấm → (kho vào bộ) hoặc ← (bộ về kho).";
  }
  return null;
}

export function validateSetReconcileLines(lines: SetReconcileLineInput[]): string | null {
  if (!lines.length) return "Phiếu bộ cần bảng thành phần.";
  for (const [i, line] of lines.entries()) {
    const label = line.tenDungCuLe || `dòng ${i + 1}`;
    const dem = Math.floor(Number(line.soLuongDem) || 0);
    const thuc = Math.floor(Number(line.soLuongThucTe) || 0);
    if (dem < 0 || thuc < 0) return `${label}: số lượng không hợp lệ.`;
    if (
      dem < thuc &&
      line.kind !== "HONG" &&
      line.kind !== "MAT" &&
      line.kind !== "XOA_DONG" &&
      line.kind !== "DIEU_CHUYEN" &&
      line.kind !== "TRA_KHO"
    ) {
      return `${label}: số đếm thấp hơn thực tế — chọn Hỏng hoặc Mất, hoặc mở tab Chuyển nếu cần điều chuyển.`;
    }
    if (line.kind === "KHOP" && dem !== thuc) {
      return `${label}: dòng khớp thì số đếm phải bằng số thực tế hệ thống.`;
    }
    if ((line.kind === "HONG" || line.kind === "MAT") && physicalQuantity(line) < 1) {
      return `${label}: Hỏng/Mất cần số đếm nhỏ hơn số thực tế.`;
    }
    if (line.kind === "BO_SUNG" && physicalQuantity(line) < 1) {
      return `${label}: Bổ sung cần số đếm lớn hơn số thực tế.`;
    }
    if (line.kind === "TRA_KHO" && physicalQuantity(line) < 1) {
      return `${label}: Trả kho cần số đếm nhỏ hơn số thực tế.`;
    }
    if (line.kind === "DIEU_CHUYEN") {
      const dest = normalizeMaBo(line.maQrDen);
      if (!dest) return `${label}: điều chuyển cần mã bộ đích.`;
      if (physicalQuantity(line) < 1) {
        return `${label}: điều chuyển cần giảm số đếm (số chuyển = thực tế − đếm).`;
      }
    }
    if (line.kind === "DOI_CHUAN") {
      const next = Math.floor(Number(line.soLuongChuanDeXuat) || 0);
      if (next < 1) return `${label}: đổi chuẩn cần số lượng chuẩn mới ≥ 1.`;
      if (next === Math.floor(Number(line.soLuongChuan) || 0)) {
        return `${label}: số chuẩn đề nghị trùng số hiện tại.`;
      }
      if (!String(line.chiTietId || "").trim()) return `${label}: thiếu dòng thành phần để đổi chuẩn.`;
    }
    if (line.kind === "DOI_LOAI") {
      if (!String(line.chiTietId || "").trim()) return `${label}: thiếu dòng thành phần để đổi mã loại.`;
      const nextMa = normalizeMaLoaiDeXuat(line.maLoaiDeXuat || line.maLoai);
      if (!nextMa && !doiLoaiIsTenChange(line)) return `${label}: đổi mã / tên loại cần nhập mã gốc danh mục đúng.`;
      if (!doiLoaiHasCatalogEdit(line)) {
        return `${label}: đổi mã / tên loại cần mã gốc mới, loại khác, hoặc tên mới.`;
      }
    }
    if (line.kind === "XOA_DONG" && !String(line.chiTietId || "").trim()) {
      return `${label}: thiếu dòng thành phần để xóa khỏi bộ.`;
    }
    if (line.kind === "THEM_DONG") {
      if (!String(line.loaiDungCuId || "").trim()) return `${label}: thêm dòng cần chọn loại dụng cụ.`;
      if (Math.floor(Number(line.soLuongChuan) || 0) < 1) return `${label}: thêm dòng cần số chuẩn ≥ 1.`;
    }
  }
  const renameByLoai = new Map<string, string>();
  for (const line of lines) {
    if (line.kind !== "DOI_LOAI" || !doiLoaiIsCatalogRename(line)) continue;
    const loaiId = String(line.loaiDungCuId || "").trim();
    const nextMa = normalizeMaLoaiDeXuat(line.maLoaiDeXuat);
    if (!loaiId || !nextMa) continue;
    const prev = renameByLoai.get(loaiId);
    if (prev && prev !== nextMa) {
      return "Một loại dụng cụ không thể đổi hai mã gốc trên cùng phiếu.";
    }
    renameByLoai.set(loaiId, nextMa);
  }
  return null;
}

export function summarizeSetReconcile(lines: SetReconcileLineInput[]) {
  const sum = {
    khop: 0,
    hong: 0,
    mat: 0,
    boSung: 0,
    doiChuan: 0,
    doiLoai: 0,
    dieuChuyen: 0,
    them: 0,
    xoa: 0,
    physicalQty: 0,
  };
  for (const line of lines) {
    if (line.kind === "KHOP") sum.khop += 1;
    if (line.kind === "HONG") sum.hong += physicalQuantity(line);
    if (line.kind === "MAT") sum.mat += physicalQuantity(line);
    if (line.kind === "BO_SUNG") sum.boSung += physicalQuantity(line);
    if (line.kind === "DOI_CHUAN") sum.doiChuan += 1;
    if (line.kind === "DOI_LOAI") sum.doiLoai += 1;
    if (line.kind === "DIEU_CHUYEN") sum.dieuChuyen += physicalQuantity(line);
    if (line.kind === "THEM_DONG") sum.them += 1;
    if (line.kind === "XOA_DONG") sum.xoa += 1;
    sum.physicalQty += physicalQuantity(line);
  }
  return sum;
}

export function isSetReconcileDraftExpired(createdAtIso: string, nowMs = Date.now()): boolean {
  const t = Date.parse(createdAtIso);
  if (!Number.isFinite(t)) return true;
  return nowMs - t > SET_RECONCILE_DRAFT_TTL_MS;
}
