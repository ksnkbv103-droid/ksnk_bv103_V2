/**
 * SC-01: thu hồi 2 pha — bộ đã cấp → chờ thu về; nhận lại tại Tiếp nhận mới mở vòng mới.
 * Pure domain — không I/O.
 */

import { isCssdCycleUsedClinically } from "./cssd-used-clinically";

export const THU_HOI_STATUS_CHO_THU_VE = "CHO_THU_VE" as const;
export const THU_HOI_STATUS_DA_THU_VE = "DA_THU_VE" as const;

export type RecallScope = "ONE_PACK" | "BATCH" | "MULTI_BATCH";

export type RecallMemberStructured = {
  quyTrinhId?: string;
  newQuyTrinhId?: string;
  maBo: string;
  tenBo?: string;
  maLo?: string;
  loId?: string;
  khoaNhanId?: string | null;
  khoaTen?: string | null;
  thoiGianCapPhat?: string | null;
  trangThai?: string;
  usedClinicallyAt?: string | null;
  usedClinicallyBy?: string | null;
  maCaMoId?: string | null;
  nguoiTra?: string | null;
  nguoiNhanCssd?: string | null;
  ghiChu?: string;
};

export type BatchRecallMemberExt = {
  id: string;
  maBo?: string | null;
  tenBo?: string | null;
  maCaMoId?: string | null;
  usedClinically?: boolean | null;
  usedClinicallyAt?: string | null;
  usedClinicallyBy?: string | null;
  metadata?: unknown;
  loId: string;
  maLo?: string | null;
  khoaNhanId?: string | null;
  thoiGianCapPhat?: string | null;
  currentStation?: string | null;
};

/** Đã cấp phát cho khoa = có mốc cấp phát (không còn nằm kho CSSD chờ xuất). */
export function isIssuedToWard(member: {
  thoiGianCapPhat?: string | null;
  khoaNhanId?: string | null;
}): boolean {
  return Boolean(String(member.thoiGianCapPhat || "").trim());
}

export function readThuHoiMeta(metadata: unknown): {
  suCoId?: string;
  khoaNhanId?: string;
  thoiGianCapPhat?: string;
  trangThai?: string;
} | null {
  if (!metadata || typeof metadata !== "object") return null;
  const thuHoi = (metadata as Record<string, unknown>).thu_hoi;
  if (!thuHoi || typeof thuHoi !== "object") return null;
  const row = thuHoi as Record<string, unknown>;
  const trangThai = String(row.trang_thai || "").trim().toUpperCase();
  if (!trangThai) return null;
  return {
    suCoId: String(row.su_co_id || "").trim() || undefined,
    khoaNhanId: String(row.khoa_nhan_id || "").trim() || undefined,
    thoiGianCapPhat: String(row.thoi_gian_cap_phat || "").trim() || undefined,
    trangThai,
  };
}

export function isChoThuVeCycle(metadata: unknown): boolean {
  return readThuHoiMeta(metadata)?.trangThai === THU_HOI_STATUS_CHO_THU_VE;
}

/** SC-01: used → list; đã cấp → chờ; còn lại → về TN ngay. */
export function partitionRecallMembersTwoPhase(members: readonly BatchRecallMemberExt[]): {
  moveNow: BatchRecallMemberExt[];
  holdPending: BatchRecallMemberExt[];
  listedOnly: BatchRecallMemberExt[];
} {
  const moveNow: BatchRecallMemberExt[] = [];
  const holdPending: BatchRecallMemberExt[] = [];
  const listedOnly: BatchRecallMemberExt[] = [];
  for (const member of members) {
    if (isCssdCycleUsedClinically(member)) {
      listedOnly.push(member);
      continue;
    }
    if (isIssuedToWard(member)) {
      holdPending.push(member);
      continue;
    }
    moveNow.push(member);
  }
  return { moveNow, holdPending, listedOnly };
}

export function recallScopeFromBatchCount(batchCount: number): RecallScope {
  if (batchCount <= 1) return "BATCH";
  return "MULTI_BATCH";
}

/** BM.01 tổng: xuất / thu hồi được / thất lạc–đã dùng. */
export function buildBm01RecallTotals(input: {
  issuedCount: number;
  returnedCount: number;
  usedCount: number;
  pendingCount: number;
}): { xuat: number; thuHoiDuoc: number; thatLacHoacDaDung: number; choThuVe: number } {
  const xuat = Math.max(0, input.issuedCount);
  const thuHoiDuoc = Math.max(0, input.returnedCount);
  const thatLacHoacDaDung = Math.max(0, input.usedCount);
  return {
    xuat,
    thuHoiDuoc,
    thatLacHoacDaDung,
    choThuVe: Math.max(0, input.pendingCount),
  };
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function mapStructuredItem(raw: unknown): RecallMemberStructured | null {
  const row = asRecord(raw);
  if (!row) return null;
  const maBo = String(row.ma_bo ?? row.maBo ?? "").trim();
  if (!maBo) return null;
  return {
    quyTrinhId: String(row.quy_trinh_id ?? row.quyTrinhId ?? "").trim() || undefined,
    newQuyTrinhId: String(row.new_quy_trinh_id ?? row.newQuyTrinhId ?? "").trim() || undefined,
    maBo,
    tenBo: String(row.ten_bo ?? row.tenBo ?? "").trim() || undefined,
    maLo: String(row.ma_lo ?? row.maLo ?? "").trim() || undefined,
    loId: String(row.lo_id ?? row.loId ?? "").trim() || undefined,
    khoaNhanId: String(row.khoa_nhan_id ?? row.khoaNhanId ?? "").trim() || null,
    khoaTen: String(row.khoa_ten ?? row.khoaTen ?? "").trim() || null,
    thoiGianCapPhat: String(row.thoi_gian_cap_phat ?? row.thoiGianCapPhat ?? "").trim() || null,
    trangThai: String(row.trang_thai ?? row.trangThai ?? "").trim() || undefined,
    usedClinicallyAt: String(row.used_clinically_at ?? row.usedClinicallyAt ?? "").trim() || null,
    usedClinicallyBy: String(row.used_clinically_by ?? row.usedClinicallyBy ?? "").trim() || null,
    maCaMoId: String(row.ma_ca_mo_id ?? row.maCaMoId ?? "").trim() || null,
    nguoiTra: String(row.nguoi_tra ?? row.nguoiTra ?? "").trim() || null,
    nguoiNhanCssd: String(row.nguoi_nhan_cssd ?? row.nguoiNhanCssd ?? "").trim() || null,
    ghiChu: String(row.ghi_chu ?? row.ghiChu ?? "").trim() || undefined,
  };
}

/** Ưu tiên JSON mảng; chuỗi legacy → parseRecallMemberListText (caller). */
export function readRecallMemberJson(raw: unknown): RecallMemberStructured[] | null {
  if (Array.isArray(raw)) {
    return raw.map(mapStructuredItem).filter((x): x is RecallMemberStructured => Boolean(x));
  }
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    if (text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map(mapStructuredItem).filter((x): x is RecallMemberStructured => Boolean(x));
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** SC-07: gộp attributes — giữ khóa trạng thái/người, cập nhật khóa thu hồi. */
export const RECALL_MERGE_PRESERVE_KEYS = [
  "INCIDENT_STATUS",
  "INCIDENT_CONFIRMED_AT",
  "INCIDENT_CONFIRMED_BY_ID",
  "INCIDENT_CONFIRMED_BY_NAME",
  "INCIDENT_CONFIRMED_BY_AUTH_USER_ID",
  "INCIDENT_CLOSED_AT",
  "INCIDENT_CLOSED_BY_ID",
  "INCIDENT_CLOSED_BY_NAME",
  "INCIDENT_CLOSED_BY_AUTH_USER_ID",
  "INCIDENT_CLOSE_REASON",
  "INCIDENT_CLOSE_BIEN_BAN",
  "NGUOI_PHAT_HIEN",
  "NGUOI_PHAT_HIEN_ID",
  "THOI_GIAN_PHAT_HIEN",
  "ANH_MINH_CHUNG",
  "REPORTER_EMAIL",
  "REPORTER_AUTH_USER_ID",
  "FAULT_OPERATOR",
  "FAULT_OPERATOR_ID",
] as const;

export function mergeRecallIncidentAttributes(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing, ...patch };
  for (const key of RECALL_MERGE_PRESERVE_KEYS) {
    if (existing[key] != null && String(existing[key]).trim() !== "") {
      next[key] = existing[key];
    }
  }
  // Gộp danh sách mẻ (không ghi đè mất).
  const prevIds = String(existing.RECALL_BATCH_IDS || "").trim();
  const patchIds = String(patch.RECALL_BATCH_IDS || "").trim();
  if (prevIds && patchIds && prevIds !== patchIds) {
    const set = new Set(
      [...prevIds.split(","), ...patchIds.split(",")]
        .map((x) => x.trim())
        .filter(Boolean),
    );
    next.RECALL_BATCH_IDS = [...set].join(",");
  }
  return next;
}

/** Đánh dấu một bộ chờ → đã thu về trong mảng hold (JSON). */
export function markHoldMemberReturned(
  holdList: readonly RecallMemberStructured[],
  quyTrinhId: string,
  opts: { newQuyTrinhId?: string; nguoiTra?: string; nguoiNhanCssd?: string },
): RecallMemberStructured[] {
  const id = String(quyTrinhId || "").trim();
  return holdList.map((row) => {
    if (String(row.quyTrinhId || "").trim() !== id) return row;
    return {
      ...row,
      trangThai: THU_HOI_STATUS_DA_THU_VE,
      newQuyTrinhId: opts.newQuyTrinhId || row.newQuyTrinhId,
      nguoiTra: opts.nguoiTra ?? row.nguoiTra,
      nguoiNhanCssd: opts.nguoiNhanCssd ?? row.nguoiNhanCssd,
    };
  });
}
