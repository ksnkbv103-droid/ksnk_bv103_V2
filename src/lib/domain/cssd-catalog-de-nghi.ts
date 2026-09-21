/** Phiếu đề nghị sửa danh mục CSSD — tách sự cố; hỗ trợ đủ trường + phiếu lô. */

export const CSSD_CATALOG_DE_NGHI_KINDS = ["LOAI", "BO", "BOM", "MIXED"] as const;
export type CssdCatalogDeNghiKind = (typeof CSSD_CATALOG_DE_NGHI_KINDS)[number];

export const CSSD_CATALOG_DE_NGHI_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type CssdCatalogDeNghiStatus = (typeof CSSD_CATALOG_DE_NGHI_STATUSES)[number];

export const CSSD_CATALOG_DE_NGHI_KIND_LABEL: Record<CssdCatalogDeNghiKind, string> = {
  LOAI: "Loại dụng cụ",
  BO: "Bộ dụng cụ",
  BOM: "Thành phần bộ",
  MIXED: "Lô danh mục",
};

/** Trường loại — khớp form master MDM. */
export type CssdCatalogDeNghiLoaiPayload = {
  ma_loai?: string | null;
  ten_loai?: string | null;
  mo_ta?: string | null;
  hinh_dang?: string | null;
  kich_thuoc?: string | null;
  cong_dung?: string | null;
  is_chiu_nhiet?: boolean | null;
  phuong_phap_tiet_khuan_chi_dinh?: string | null;
  phan_loai_spaulding?: string | null;
  phan_loai?: string | null;
  so_luong_kho_du_phong?: number | null;
  is_active?: boolean | null;
};

export type CssdCatalogDeNghiBoPayload = {
  ma_bo?: string | null;
  ten_bo?: string | null;
  loai_dung_cu_id?: string | null;
  khoa_su_dung_id?: string | null;
  quy_cach?: string | null;
  ghi_chu?: string | null;
  trang_thai?: string | null;
  phan_loai_bo?: string | null;
  co_ma_dinh_danh_rieng?: boolean | null;
  is_active?: boolean | null;
};

export type CssdCatalogDeNghiBomLine = {
  op: "UPSERT" | "DELETE";
  chiTietId?: string | null;
  loaiDungCuId?: string | null;
  maLoai?: string | null;
  maChiTiet?: string | null;
  tenDungCuLe?: string | null;
  tenChiTiet?: string | null;
  soLuong?: number | null;
  maxSudsCount?: number | null;
  trongLuong?: number | string | null;
  ghiChu?: string | null;
};

export type CssdCatalogDeNghiBomPayload = {
  lines: CssdCatalogDeNghiBomLine[];
};

export type CssdCatalogDeNghiItemOp = "UPDATE" | "CREATE";

export type CssdCatalogDeNghiItem = {
  kind: "LOAI" | "BO" | "BOM";
  /** UPDATE = sửa master; CREATE = bổ sung mới (admin duyệt mới INSERT). */
  op?: CssdCatalogDeNghiItemOp;
  targetId?: string | null;
  targetMa?: string | null;
  targetTen?: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export type CssdCatalogDeNghiRow = {
  id: string;
  targetKind: CssdCatalogDeNghiKind;
  targetId: string | null;
  targetMa: string;
  targetTen: string;
  payloadBefore: Record<string, unknown>;
  payloadAfter: Record<string, unknown>;
  note: string;
  status: CssdCatalogDeNghiStatus;
  nguoiDeNghiId: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  rejectReason: string;
  createdAt: string;
};

export function isCssdCatalogDeNghiKind(v: unknown): v is CssdCatalogDeNghiKind {
  return CSSD_CATALOG_DE_NGHI_KINDS.includes(String(v || "").trim().toUpperCase() as CssdCatalogDeNghiKind);
}

export function parseCssdCatalogDeNghiKind(v: unknown): CssdCatalogDeNghiKind | null {
  const k = String(v || "").trim().toUpperCase();
  return isCssdCatalogDeNghiKind(k) ? k : null;
}

export function catalogDeNghiHref(params?: {
  kind?: Exclude<CssdCatalogDeNghiKind, "MIXED"> | null;
  ma?: string | null;
  ten?: string | null;
  targetId?: string | null;
  note?: string | null;
  batch?: boolean;
}): string {
  const q = new URLSearchParams();
  q.set("tab", params?.batch ? "DE_NGHI" : "DE_NGHI");
  if (params?.batch) q.set("mode", "batch");
  if (params?.kind) q.set("kind", params.kind);
  const ma = String(params?.ma || "").trim();
  if (ma) q.set("ma", ma);
  const ten = String(params?.ten || "").trim();
  if (ten) q.set("ten", ten);
  const targetId = String(params?.targetId || "").trim();
  if (targetId) q.set("targetId", targetId);
  const note = String(params?.note || "").trim();
  if (note) q.set("note", note);
  return `/cssd-dung-cu?${q.toString()}`;
}

/** Chuẩn hóa payload phiếu → danh sách dòng (single hoặc lô). */
export function normalizeDeNghiItems(args: {
  targetKind: CssdCatalogDeNghiKind;
  targetId?: string | null;
  targetMa?: string | null;
  targetTen?: string | null;
  payloadBefore?: Record<string, unknown>;
  payloadAfter: Record<string, unknown>;
}): CssdCatalogDeNghiItem[] {
  const after = args.payloadAfter || {};
  const before = args.payloadBefore || {};
  if (Array.isArray(after.items)) {
    return (after.items as CssdCatalogDeNghiItem[]).map((it) => ({
      kind: it.kind,
      op: it.op === "CREATE" ? "CREATE" : "UPDATE",
      targetId: it.targetId ?? null,
      targetMa: it.targetMa ?? null,
      targetTen: it.targetTen ?? null,
      before: (it.before as Record<string, unknown>) || {},
      after: (it.after as Record<string, unknown>) || {},
    }));
  }
  const kind = args.targetKind === "MIXED" ? "LOAI" : args.targetKind;
  if (kind !== "LOAI" && kind !== "BO" && kind !== "BOM") return [];
  const headerOp = after.__op === "CREATE" || before.__op === "CREATE" ? "CREATE" : "UPDATE";
  return [
    {
      kind,
      op: headerOp,
      targetId: args.targetId ?? null,
      targetMa: args.targetMa ?? null,
      targetTen: args.targetTen ?? null,
      before,
      after,
    },
  ];
}

export function buildBatchPayload(items: CssdCatalogDeNghiItem[]): {
  targetKind: CssdCatalogDeNghiKind;
  targetMa: string;
  targetTen: string;
  payloadBefore: Record<string, unknown>;
  payloadAfter: Record<string, unknown>;
} {
  const clean = items.filter((it) => it.kind === "LOAI" || it.kind === "BO" || it.kind === "BOM");
  if (clean.length === 0) {
    return {
      targetKind: "MIXED",
      targetMa: "",
      targetTen: "",
      payloadBefore: {},
      payloadAfter: { items: [] },
    };
  }
  const kinds = new Set(clean.map((x) => x.kind));
  const targetKind: CssdCatalogDeNghiKind =
    clean.length === 1 ? clean[0].kind : kinds.size === 1 ? clean[0].kind : "MIXED";
  const label =
    clean.length === 1
      ? `${clean[0].targetMa || ""} ${clean[0].targetTen || ""}`.trim()
      : `${clean.length} mục`;
  return {
    targetKind,
    targetMa: clean.length === 1 ? String(clean[0].targetMa || "") : `LO-${clean.length}`,
    targetTen: label,
    payloadBefore: {},
    payloadAfter: { items: clean },
  };
}

export function summarizeDeNghiAfter(kind: CssdCatalogDeNghiKind, after: Record<string, unknown>): string {
  const items = normalizeDeNghiItems({
    targetKind: kind,
    payloadAfter: after,
  });
  if (items.length > 1 || kind === "MIXED") {
    return items
      .map((it) => {
        const verb = it.op === "CREATE" ? "Bổ sung" : "Sửa";
        const head = `${verb} ${CSSD_CATALOG_DE_NGHI_KIND_LABEL[it.kind]} ${it.targetMa || ""}`.trim();
        return `${head}: ${summarizeOne(it.kind, it.after)}`;
      })
      .join(" · ");
  }
  if (items.length === 1 && items[0].op === "CREATE") {
    return `Bổ sung ${summarizeOne(items[0].kind, items[0].after)}`;
  }
  if (items.length === 1) return summarizeOne(items[0].kind, items[0].after);
  return "—";
}

function summarizeOne(kind: "LOAI" | "BO" | "BOM", after: Record<string, unknown>): string {
  if (kind === "LOAI") {
    const ma = String(after.ma_loai || "").trim();
    const ten = String(after.ten_loai || "").trim();
    const nhiet =
      after.is_chiu_nhiet === true ? "Cao" : after.is_chiu_nhiet === false ? "Thấp" : "";
    return [ma, ten, nhiet].filter(Boolean).join(" · ") || "—";
  }
  if (kind === "BO") {
    const ma = String(after.ma_bo || "").trim();
    const ten = String(after.ten_bo || "").trim();
    return [ma, ten].filter(Boolean).join(" · ") || "—";
  }
  const lines = Array.isArray((after as CssdCatalogDeNghiBomPayload).lines)
    ? (after as CssdCatalogDeNghiBomPayload).lines
    : [];
  if (!lines.length) return "—";
  return `${lines.length} dòng TP`;
}

export function validateDeNghiPayload(
  kind: CssdCatalogDeNghiKind,
  after: Record<string, unknown>,
): string | null {
  const items = normalizeDeNghiItems({ targetKind: kind, payloadAfter: after });
  if (!items.length) return "Phiếu cần ít nhất một dòng đề nghị.";
  for (const it of items) {
    const err = validateOne(it.kind, it.after);
    if (err) return `${CSSD_CATALOG_DE_NGHI_KIND_LABEL[it.kind]}: ${err}`;
  }
  return null;
}

function validateOne(kind: "LOAI" | "BO" | "BOM", after: Record<string, unknown>): string | null {
  if (kind === "BOM") {
    const lines = Array.isArray((after as CssdCatalogDeNghiBomPayload).lines)
      ? (after as CssdCatalogDeNghiBomPayload).lines
      : [];
    if (!lines.length) return "cần ít nhất một dòng thành phần.";
    for (const l of lines) {
      if (l.op !== "UPSERT" && l.op !== "DELETE") return "op dòng không hợp lệ.";
      if (l.op === "UPSERT" && !String(l.loaiDungCuId || l.maLoai || "").trim()) {
        return "UPSERT cần loại dụng cụ.";
      }
    }
    return null;
  }
  if (kind === "LOAI") {
    if (!String(after.ma_loai || "").trim() && !String(after.ten_loai || "").trim()) {
      return "cần mã hoặc tên.";
    }
    return null;
  }
  if (!String(after.ma_bo || "").trim() && !String(after.ten_bo || "").trim()) {
    return "cần mã hoặc tên bộ.";
  }
  return null;
}

/** Nhãn tiếng Việt cho trường thường gặp trên phiếu đề nghị. */
export const CSSD_CATALOG_DE_NGHI_FIELD_LABELS: Record<string, string> = {
  ma_loai: "Mã loại",
  ten_loai: "Tên loại",
  mo_ta: "Mô tả",
  hinh_dang: "Hình dáng",
  kich_thuoc: "Kích thước",
  cong_dung: "Công dụng",
  is_chiu_nhiet: "Chịu nhiệt",
  phuong_phap_tiet_khuan_chi_dinh: "Phương pháp TK",
  phan_loai_spaulding: "Spaulding",
  phan_loai: "Phân loại",
  so_luong_kho_du_phong: "Kho dự phòng",
  is_active: "Đang hoạt động",
  ma_bo: "Mã bộ",
  ten_bo: "Tên bộ",
  loai_dung_cu_id: "Loại dụng cụ (id)",
  khoa_su_dung_id: "Khoa sử dụng (id)",
  quy_cach: "Quy cách",
  ghi_chu: "Ghi chú",
  trang_thai: "Trạng thái",
  phan_loai_bo: "Phân loại bộ",
  co_ma_dinh_danh_rieng: "Mã định danh riêng",
  lines: "Thành phần (BOM)",
};

export type CssdCatalogDeNghiFieldDiff = {
  key: string;
  label: string;
  beforeText: string;
  afterText: string;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function formatDeNghiScalar(key: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") {
    const t = v.trim();
    return t || "—";
  }
  if (typeof v === "boolean") {
    if (key === "is_chiu_nhiet") return v ? "Chịu nhiệt cao" : "Nhạy nhiệt";
    return v ? "Có" : "Không";
  }
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "—";
  return "—";
}

function summarizeBomLineOp(line: unknown): string {
  if (!isPlainObject(line)) return "—";
  const op = String(line.op || "").toUpperCase();
  const ma = String(line.maLoai || line.maChiTiet || "").trim();
  const ten = String(line.tenDungCuLe || line.tenChiTiet || "").trim();
  const head = [ma, ten].filter(Boolean).join(" · ") || "—";
  if (op === "DELETE") return `Xóa: ${head}`;
  const qtyRaw = line.soLuong;
  const qty =
    qtyRaw != null && String(qtyRaw).trim() !== "" ? ` × ${qtyRaw}` : "";
  return `UPSERT: ${head}${qty}`;
}

function summarizeBomLines(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "—";
  return value.map(summarizeBomLineOp).join("; ");
}

/**
 * So sánh before/after của một mục đề nghị → danh sách trường đổi.
 * Bỏ `__op` và object lồng; `lines` (BOM) hiển thị dạng op gọn.
 */
export function listDeNghiFieldDiffs(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): CssdCatalogDeNghiFieldDiff[] {
  const b = before || {};
  const a = after || {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const out: CssdCatalogDeNghiFieldDiff[] = [];
  for (const key of Array.from(keys).sort()) {
    if (key === "__op" || key === "items") continue;
    const bv = b[key];
    const av = a[key];
    if (key === "lines") {
      const beforeText = summarizeBomLines(bv);
      const afterText = summarizeBomLines(av);
      if (beforeText === afterText) continue;
      out.push({
        key,
        label: CSSD_CATALOG_DE_NGHI_FIELD_LABELS[key] || key,
        beforeText,
        afterText,
      });
      continue;
    }
    if (isPlainObject(bv) || isPlainObject(av) || Array.isArray(bv) || Array.isArray(av)) {
      continue;
    }
    const beforeText = formatDeNghiScalar(key, bv);
    const afterText = formatDeNghiScalar(key, av);
    if (beforeText === afterText) continue;
    out.push({
      key,
      label: CSSD_CATALOG_DE_NGHI_FIELD_LABELS[key] || key,
      beforeText,
      afterText,
    });
  }
  return out;
}

/** Khóa đích để phát hiện phiếu APPROVED sau chồng mục (hoàn tác). */
export function collectCatalogDeNghiTargetKeys(args: {
  targetKind: CssdCatalogDeNghiKind;
  targetId?: string | null;
  targetMa?: string | null;
  payloadBefore?: Record<string, unknown>;
  payloadAfter?: Record<string, unknown>;
}): string[] {
  const items = normalizeDeNghiItems({
    targetKind: args.targetKind,
    targetId: args.targetId,
    targetMa: args.targetMa,
    payloadBefore: args.payloadBefore,
    payloadAfter: args.payloadAfter || {},
  });
  const keys = new Set<string>();
  const add = (kind: string, id?: string | null, ma?: string | null) => {
    const tid = String(id || "").trim();
    const tma = String(ma || "").trim().toUpperCase();
    if (tid) keys.add(`${kind}:id:${tid}`);
    if (tma) keys.add(`${kind}:ma:${tma}`);
  };
  // Header-level (non-MIXED / single)
  if (args.targetKind !== "MIXED") {
    add(args.targetKind, args.targetId, args.targetMa);
  }
  for (const it of items) {
    add(it.kind, it.targetId, it.targetMa);
    if (it.kind === "LOAI") {
      add("LOAI", null, String(it.after?.ma_loai || it.before?.ma_loai || ""));
    } else if (it.kind === "BO") {
      add("BO", null, String(it.after?.ma_bo || it.before?.ma_bo || ""));
    }
  }
  return Array.from(keys);
}

export function catalogDeNghiTargetsOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const setB = new Set(b);
  return a.some((k) => setB.has(k));
}

/** Snapshot trước duyệt rỗng / chỉ __op → không hoàn tác UPDATE được. */
export function isEmptyDeNghiBeforeSnapshot(before: Record<string, unknown> | null | undefined): boolean {
  const b = before || {};
  const keys = Object.keys(b).filter((k) => k !== "__op");
  if (keys.length === 0) return true;
  if (keys.length === 1 && keys[0] === "lines") {
    const lines = b.lines;
    return !Array.isArray(lines) || lines.length === 0;
  }
  return false;
}

/** Thông báo mã loại trùng — luôn kèm tên loại đã có để rà soát. */
export function formatMaLoaiTrungMessage(ma: string, tenDaCo: string | null | undefined): string {
  const code = String(ma || "").trim().toUpperCase();
  const ten = String(tenDaCo || "").trim();
  if (!code) return "Thiếu mã loại.";
  if (ten) return `Mã loại ${code} đã có trong danh mục: «${ten}». Đổi mã khác hoặc dùng Đề nghị sửa loại đó.`;
  return `Mã loại ${code} đã tồn tại trong danh mục. Đổi mã khác hoặc rà soát loại đã có.`;
}
