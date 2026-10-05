/**
 * Báo cáo kỳ QLCV MVP — Domain SSOT §6 (Q-14).
 * Aggregate thuần TS từ rows fact (không RPC mới).
 */

import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isQlcvBoardOverdue } from "./qlcv-board-lanes";
import { isDeXuatChoDuyet } from "./qlcv-workflow-display";
import type { QlcvPeriodKind, QlcvPeriodRange } from "./qlcv-period-range";
import { qlcvDateVnFromInstant } from "./qlcv-today-vn";

/** Cap fetch báo cáo — pilot/small volume; UI cảnh báo khi truncated. */
export const QLCV_BAO_CAO_FETCH_CAP = 2000;

/** Kỳ báo cáo §6: tuần / tháng / quý (không dùng YEAR trên UI MVP). */
export type QlcvBaoCaoPeriodKind = Extract<QlcvPeriodKind, "WEEK" | "MONTH" | "QUARTER">;

export const QLCV_BAO_CAO_PERIOD_KINDS: QlcvBaoCaoPeriodKind[] = ["WEEK", "MONTH", "QUARTER"];

/** Cột tối thiểu từ qlcv_fact_cong_viec (+ tên join). */
export type QlcvBaoCaoRow = {
  id: string;
  tieu_de: string;
  trang_thai: string | null;
  is_active: boolean | null;
  han_hoan_thanh: string | null;
  hoan_thanh_luc: string | null;
  phan_tram_hoan_thanh: number | null;
  nguoi_phu_trach_id: string | null;
  nguoi_phu_trach_ten: string | null;
  nguoi_giao_viec_id: string | null;
  nguoi_giao_ten: string | null;
  created_at: string | null;
};

export type QlcvBaoCaoTheoNguoi = {
  nguoi_phu_trach_id: string | null;
  phu_trach: string;
  mo: number;
  qua_han: number;
  hoan_thanh: number;
  dung_han: number;
};

export type QlcvBaoCaoTheoTrangThai = {
  ma: string;
  nhan: string;
  so_luong: number;
};

export type QlcvBaoCaoQuaHanItem = {
  id: string;
  tieu_de: string;
  han_hoan_thanh: string | null;
  phu_trach: string;
  nguoi_giao: string;
  phan_tram_hoan_thanh: number;
};

export type QlcvBaoCaoDongHanItem = {
  id: string;
  tieu_de: string;
  phu_trach: string;
  han_hoan_thanh: string | null;
  hoan_thanh_luc: string | null;
  ket_qua: "DUNG_HAN" | "TRE" | "KHONG_HAN";
};

export type QlcvBaoCaoKyPayload = {
  period: QlcvPeriodRange;
  fetched: number;
  truncated: boolean;
  fetchCap: number;
  theoNguoi: QlcvBaoCaoTheoNguoi[];
  theoTrangThai: QlcvBaoCaoTheoTrangThai[];
  quaHan: QlcvBaoCaoQuaHanItem[];
  dongHan: QlcvBaoCaoDongHanItem[];
};

const CANONICAL_STATUS_ORDER = [
  "MOI",
  "DANG_LAM",
  "CHO_DUYET",
  "HOAN_THANH",
  "TU_CHOI",
  "QUA_HAN",
  "DA_HUY",
] as const;

const STATUS_LABEL: Record<string, string> = {
  MOI: "Mới",
  DANG_LAM: "Đang làm",
  CHO_DUYET: "Chờ nghiệm thu",
  HOAN_THANH: "Hoàn thành",
  TU_CHOI: "Từ chối",
  QUA_HAN: "Quá hạn",
  DA_HUY: "Đã hủy",
  DE_XUAT: "Đề xuất (chờ duyệt)",
};

export function isoDateOnly(raw: string | null | undefined): string {
  return qlcvDateVnFromInstant(raw);
}

function inPeriod(iso: string, period: QlcvPeriodRange): boolean {
  if (!iso) return false;
  return iso >= period.startIso && iso <= period.endIso;
}

/** Phiếu chạm kỳ: hạn / ngày tạo / lúc hoàn thành nằm trong [start, end]. */
export function rowTouchesPeriod(row: QlcvBaoCaoRow, period: QlcvPeriodRange): boolean {
  const han = isoDateOnly(row.han_hoan_thanh);
  if (han && inPeriod(han, period)) return true;
  const done = isoDateOnly(row.hoan_thanh_luc);
  if (done && inPeriod(done, period)) return true;
  const created = isoDateOnly(row.created_at);
  if (!han && created && inPeriod(created, period)) return true;
  if (created && inPeriod(created, period)) return true;
  return false;
}

function isClosed(row: QlcvBaoCaoRow): boolean {
  const st = normalizeQlcvTrangThaiToCanonical(row.trang_thai);
  return st === "HOAN_THANH" || st === "DA_HUY";
}

function isOpenActive(row: QlcvBaoCaoRow): boolean {
  if (isDeXuatChoDuyet(row)) return false;
  if (row.is_active === false) return false;
  return !isClosed(row);
}

function isCompletedOnTime(row: QlcvBaoCaoRow): boolean {
  const st = normalizeQlcvTrangThaiToCanonical(row.trang_thai);
  if (st !== "HOAN_THANH") return false;
  const done = isoDateOnly(row.hoan_thanh_luc);
  const han = isoDateOnly(row.han_hoan_thanh);
  if (!done) return false;
  if (!han) return false; // QLCV-10: không hạn → không tính đúng hạn
  return done <= han;
}

function displayName(ten: string | null | undefined, id: string | null | undefined): string {
  const t = String(ten ?? "").trim();
  if (t) return t;
  if (id) return `(chưa có tên · ${String(id).slice(0, 8)})`;
  return "— Chưa giao phụ trách —";
}

/** §6.1 Việc theo người (kỳ). */
export function aggregateTheoNguoi(rows: QlcvBaoCaoRow[], period: QlcvPeriodRange): QlcvBaoCaoTheoNguoi[] {
  const inKy = rows.filter((r) => rowTouchesPeriod(r, period));
  const map = new Map<string, QlcvBaoCaoTheoNguoi>();

  const keyOf = (r: QlcvBaoCaoRow) => r.nguoi_phu_trach_id ?? "__none__";

  for (const r of inKy) {
    const k = keyOf(r);
    let bucket = map.get(k);
    if (!bucket) {
      bucket = {
        nguoi_phu_trach_id: r.nguoi_phu_trach_id,
        phu_trach: displayName(r.nguoi_phu_trach_ten, r.nguoi_phu_trach_id),
        mo: 0,
        qua_han: 0,
        hoan_thanh: 0,
        dung_han: 0,
      };
      map.set(k, bucket);
    }

    if (isOpenActive(r)) {
      bucket.mo += 1;
      if (isQlcvBoardOverdue(r)) bucket.qua_han += 1;
    }

    const st = normalizeQlcvTrangThaiToCanonical(r.trang_thai);
    if (st === "HOAN_THANH" && inPeriod(isoDateOnly(r.hoan_thanh_luc), period)) {
      bucket.hoan_thanh += 1;
      if (isCompletedOnTime(r)) bucket.dung_han += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.mo !== a.mo) return b.mo - a.mo;
    if (b.qua_han !== a.qua_han) return b.qua_han - a.qua_han;
    return a.phu_trach.localeCompare(b.phu_trach, "vi");
  });
}

/** §6.2 Việc theo trạng thái (thời điểm trên tập fetch; đề xuất tách bucket). */
export function aggregateTheoTrangThai(rows: QlcvBaoCaoRow[]): QlcvBaoCaoTheoTrangThai[] {
  const counts = new Map<string, number>();
  for (const ma of CANONICAL_STATUS_ORDER) counts.set(ma, 0);
  counts.set("DE_XUAT", 0);

  for (const r of rows) {
    if (isDeXuatChoDuyet(r)) {
      counts.set("DE_XUAT", (counts.get("DE_XUAT") ?? 0) + 1);
      continue;
    }
    const st = normalizeQlcvTrangThaiToCanonical(r.trang_thai);
    if (counts.has(st)) {
      counts.set(st, (counts.get(st) ?? 0) + 1);
    } else {
      counts.set(st, (counts.get(st) ?? 0) + 1);
    }
  }

  const out: QlcvBaoCaoTheoTrangThai[] = [];
  for (const ma of [...CANONICAL_STATUS_ORDER, "DE_XUAT"] as const) {
    out.push({
      ma,
      nhan: STATUS_LABEL[ma] ?? ma,
      so_luong: counts.get(ma) ?? 0,
    });
  }
  for (const [ma, n] of counts) {
    if (CANONICAL_STATUS_ORDER.includes(ma as (typeof CANONICAL_STATUS_ORDER)[number]) || ma === "DE_XUAT") {
      continue;
    }
    out.push({ ma, nhan: ma, so_luong: n });
  }
  return out;
}

/** §6.3 Quá hạn (thời điểm) — phiếu mở quá hạn. */
export function listQuaHanMo(rows: QlcvBaoCaoRow[]): QlcvBaoCaoQuaHanItem[] {
  return rows
    .filter((r) => isOpenActive(r) && isQlcvBoardOverdue(r))
    .map((r) => ({
      id: r.id,
      tieu_de: r.tieu_de || "(không tiêu đề)",
      han_hoan_thanh: isoDateOnly(r.han_hoan_thanh) || null,
      phu_trach: displayName(r.nguoi_phu_trach_ten, r.nguoi_phu_trach_id),
      nguoi_giao: displayName(r.nguoi_giao_ten, r.nguoi_giao_viec_id),
      phan_tram_hoan_thanh: Number(r.phan_tram_hoan_thanh ?? 0) || 0,
    }))
    .sort((a, b) => {
      const ha = a.han_hoan_thanh ?? "9999";
      const hb = b.han_hoan_thanh ?? "9999";
      if (ha !== hb) return ha.localeCompare(hb);
      return a.tieu_de.localeCompare(b.tieu_de, "vi");
    });
}

/** §6.4 Đúng hạn / trễ trong kỳ đóng. */
export function listDongHanTrongKy(rows: QlcvBaoCaoRow[], period: QlcvPeriodRange): QlcvBaoCaoDongHanItem[] {
  return rows
    .filter((r) => {
      const st = normalizeQlcvTrangThaiToCanonical(r.trang_thai);
      if (st !== "HOAN_THANH") return false;
      return inPeriod(isoDateOnly(r.hoan_thanh_luc), period);
    })
    .map((r) => {
      const han = isoDateOnly(r.han_hoan_thanh) || null;
      const done = isoDateOnly(r.hoan_thanh_luc) || null;
      let ket_qua: QlcvBaoCaoDongHanItem["ket_qua"] = "KHONG_HAN";
      if (han && done) ket_qua = done <= han ? "DUNG_HAN" : "TRE";
      else if (!han && done) ket_qua = "KHONG_HAN";
      return {
        id: r.id,
        tieu_de: r.tieu_de || "(không tiêu đề)",
        phu_trach: displayName(r.nguoi_phu_trach_ten, r.nguoi_phu_trach_id),
        han_hoan_thanh: han,
        hoan_thanh_luc: done,
        ket_qua,
      };
    })
    .sort((a, b) => {
      const da = a.hoan_thanh_luc ?? "";
      const db = b.hoan_thanh_luc ?? "";
      if (da !== db) return db.localeCompare(da);
      return a.tieu_de.localeCompare(b.tieu_de, "vi");
    });
}

export function buildQlcvBaoCaoKyPayload(
  rows: QlcvBaoCaoRow[],
  period: QlcvPeriodRange,
  opts: { truncated: boolean; fetchCap?: number },
): QlcvBaoCaoKyPayload {
  return {
    period,
    fetched: rows.length,
    truncated: opts.truncated,
    fetchCap: opts.fetchCap ?? QLCV_BAO_CAO_FETCH_CAP,
    theoNguoi: aggregateTheoNguoi(rows, period),
    theoTrangThai: aggregateTheoTrangThai(rows),
    quaHan: listQuaHanMo(rows),
    dongHan: listDongHanTrongKy(rows, period),
  };
}

export function ketQuaDongHanLabel(k: QlcvBaoCaoDongHanItem["ket_qua"]): string {
  if (k === "DUNG_HAN") return "Đúng hạn";
  if (k === "TRE") return "Trễ hạn";
  return "Không có hạn";
}

/** CSV thô (UTF-8 BOM) từ mảng object — cột = keys của hàng đầu. */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "\uFEFF";
  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [keys.join(",")];
  for (const row of rows) {
    lines.push(keys.map((k) => esc(row[k])).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}
