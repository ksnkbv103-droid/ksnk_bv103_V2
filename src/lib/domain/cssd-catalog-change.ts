/** Đề xuất thay đổi danh mục dụng cụ — KTV gửi, tổ trưởng/ADMIN duyệt rồi mới ghi master. */

export const CATALOG_THAO_TAC = ["THEM", "SUA", "XOA", "DIEU_CHUYEN"] as const;
export const CATALOG_DOI_TUONG = ["LOAI_DUNG_CU", "BO_DUNG_CU", "CHI_TIET"] as const;
export const CATALOG_TRANG_THAI = ["CHO_DUYET", "DA_DUYET", "TU_CHOI"] as const;

export type CatalogThaoTac = (typeof CATALOG_THAO_TAC)[number];
export type CatalogDoiTuong = (typeof CATALOG_DOI_TUONG)[number];
export type CatalogTrangThai = (typeof CATALOG_TRANG_THAI)[number];

export type CatalogChangeDraftInput = {
  loaiThaoTac: CatalogThaoTac;
  doiTuong: CatalogDoiTuong;
  lyDo: string;
  maBo?: string;
  maBoDen?: string;
  loaiDungCuId?: string;
  chiTietId?: string;
  soLuong?: number;
  ten?: string;
  ma?: string;
};

export type CatalogApplyOp =
  | { op: "insert"; table: string; row: Record<string, unknown> }
  | { op: "update"; table: string; id: string; row: Record<string, unknown> }
  | { op: "soft_delete"; table: string; id: string }
  | {
      op: "ledger";
      loaiGiaoDich: "DIEU_CHUYEN";
      loaiDungCuId: string;
      boDungCuId: string | null;
      boDungCuIdDen: string | null;
      soLuong: number;
      ghiChu: string;
    };

export type CatalogMasterSnapshot = {
  loai?: { id: string; ma_loai: string; ten_loai: string; is_active: boolean } | null;
  bo?: { id: string; ma_bo: string; ten_bo: string; is_active: boolean } | null;
  boDen?: { id: string; ma_bo: string; ten_bo: string; is_active: boolean } | null;
  chiTiet?: {
    id: string;
    bo_dung_cu_id: string | null;
    loai_dung_cu_id: string | null;
    ten_dung_cu_le: string;
    so_luong: number;
    is_active: boolean;
  } | null;
  chiTietDen?: { id: string; so_luong: number } | null;
  reserve?: number;
};

export type PermRow = { module: string; action: string };

const PROPOSE_MODULES = ["CSSD_WORKFLOW", "CSSD_KHO_DUNGCU"] as const;

export function approveModuleForTarget(
  doiTuong: CatalogDoiTuong,
  thaoTac: CatalogThaoTac,
): "LOAI_DC" | "BO_DC" | "DC_LE" {
  if (thaoTac === "DIEU_CHUYEN") return "BO_DC";
  if (doiTuong === "LOAI_DUNG_CU") return "LOAI_DC";
  if (doiTuong === "BO_DUNG_CU") return "BO_DC";
  return "DC_LE";
}

export function canProposeCatalogChange(roles: string[], perms: PermRow[]): boolean {
  if (roles.includes("ADMIN")) return true;
  return perms.some(
    (p) =>
      PROPOSE_MODULES.includes(p.module as (typeof PROPOSE_MODULES)[number]) && p.action === "edit",
  );
}

export function canApproveCatalogChange(
  roles: string[],
  perms: PermRow[],
  doiTuong: CatalogDoiTuong,
  thaoTac: CatalogThaoTac,
): boolean {
  if (roles.includes("ADMIN")) return true;
  const mod = approveModuleForTarget(doiTuong, thaoTac);
  return perms.some((p) => p.module === mod && p.action === "approve");
}

export function validateCatalogChangeDraft(input: CatalogChangeDraftInput): string | null {
  if (!CATALOG_THAO_TAC.includes(input.loaiThaoTac)) return "Loại thao tác không hợp lệ.";
  if (!CATALOG_DOI_TUONG.includes(input.doiTuong)) return "Đối tượng không hợp lệ.";
  if (!String(input.lyDo || "").trim()) return "Cần nêu lý do đề xuất.";

  if (input.loaiThaoTac === "DIEU_CHUYEN") {
    if (!String(input.maBo || "").trim()) return "Điều chuyển cần mã bộ nguồn.";
    if (!String(input.loaiDungCuId || "").trim()) return "Điều chuyển cần loại dụng cụ.";
    const qty = Math.floor(Number(input.soLuong || 0));
    if (qty <= 0) return "Số lượng điều chuyển phải lớn hơn 0.";
    return null;
  }

  if (input.doiTuong === "CHI_TIET") {
    if (!String(input.maBo || "").trim() && input.loaiThaoTac === "THEM") {
      return "Thêm thành phần cần mã bộ.";
    }
    if (input.loaiThaoTac !== "THEM" && !String(input.chiTietId || "").trim()) {
      return "Sửa / xóa thành phần cần chọn dòng chi tiết.";
    }
    if (input.loaiThaoTac === "THEM" && !String(input.loaiDungCuId || "").trim()) {
      return "Thêm thành phần cần loại dụng cụ.";
    }
  }

  if (input.doiTuong === "LOAI_DUNG_CU" && input.loaiThaoTac === "THEM") {
    if (!String(input.ma || "").trim() || !String(input.ten || "").trim()) {
      return "Thêm loại dụng cụ cần mã và tên.";
    }
  }

  if (input.doiTuong === "BO_DUNG_CU" && input.loaiThaoTac === "THEM") {
    if (!String(input.ma || input.maBo || "").trim() || !String(input.ten || "").trim()) {
      return "Thêm bộ dụng cụ cần mã bộ và tên.";
    }
  }

  if (input.loaiThaoTac !== "THEM" && input.doiTuong === "LOAI_DUNG_CU" && !input.loaiDungCuId) {
    return "Sửa / xóa loại cần chọn loại dụng cụ.";
  }
  if (input.loaiThaoTac !== "THEM" && input.doiTuong === "BO_DUNG_CU" && !String(input.maBo || "").trim()) {
    return "Sửa / xóa bộ cần mã bộ.";
  }
  return null;
}

export function buildCatalogBeforeAfter(
  input: CatalogChangeDraftInput,
  snap: CatalogMasterSnapshot,
): { truoc: Record<string, unknown> | null; sau: Record<string, unknown> } {
  const qty = Math.max(1, Math.floor(Number(input.soLuong || 1) || 1));
  if (input.loaiThaoTac === "DIEU_CHUYEN") {
    return {
      truoc: {
        ma_bo: snap.bo?.ma_bo || input.maBo || null,
        so_luong: snap.chiTiet?.so_luong ?? null,
        loai_dung_cu_id: input.loaiDungCuId || snap.chiTiet?.loai_dung_cu_id || null,
      },
      sau: {
        ma_bo_den: input.maBoDen?.trim() || "KHO_LE",
        so_luong: qty,
      },
    };
  }
  if (input.doiTuong === "LOAI_DUNG_CU") {
    return {
      truoc: snap.loai
        ? { ma_loai: snap.loai.ma_loai, ten_loai: snap.loai.ten_loai, is_active: snap.loai.is_active }
        : null,
      sau: {
        ma_loai: input.ma || snap.loai?.ma_loai || null,
        ten_loai: input.ten || snap.loai?.ten_loai || null,
        thao_tac: input.loaiThaoTac,
      },
    };
  }
  if (input.doiTuong === "BO_DUNG_CU") {
    return {
      truoc: snap.bo ? { ma_bo: snap.bo.ma_bo, ten_bo: snap.bo.ten_bo, is_active: snap.bo.is_active } : null,
      sau: {
        ma_bo: input.ma || input.maBo || snap.bo?.ma_bo || null,
        ten_bo: input.ten || snap.bo?.ten_bo || null,
        thao_tac: input.loaiThaoTac,
      },
    };
  }
  return {
    truoc: snap.chiTiet
      ? {
          id: snap.chiTiet.id,
          ten: snap.chiTiet.ten_dung_cu_le,
          so_luong: snap.chiTiet.so_luong,
        }
      : null,
    sau: {
      ten: input.ten || snap.chiTiet?.ten_dung_cu_le || null,
      so_luong: input.soLuong ?? snap.chiTiet?.so_luong ?? 1,
      thao_tac: input.loaiThaoTac,
    },
  };
}

export function planCatalogChangeApply(
  input: CatalogChangeDraftInput,
  snap: CatalogMasterSnapshot,
): { ok: true; ops: CatalogApplyOp[] } | { ok: false; error: string } {
  const err = validateCatalogChangeDraft(input);
  if (err) return { ok: false, error: err };
  const now = new Date().toISOString();
  const qty = Math.max(1, Math.floor(Number(input.soLuong || 1) || 1));

  if (input.loaiThaoTac === "DIEU_CHUYEN") {
    return planTransfer(input, snap, qty, now);
  }
  if (input.doiTuong === "LOAI_DUNG_CU") return planLoai(input, snap, now);
  if (input.doiTuong === "BO_DUNG_CU") return planBo(input, snap, now);
  return planChiTiet(input, snap, qty, now);
}

function planLoai(
  input: CatalogChangeDraftInput,
  snap: CatalogMasterSnapshot,
  now: string,
): { ok: true; ops: CatalogApplyOp[] } | { ok: false; error: string } {
  if (input.loaiThaoTac === "THEM") {
    return {
      ok: true,
      ops: [
        {
          op: "insert",
          table: "cssd_dm_loai_dung_cu",
          row: {
            ma_loai: String(input.ma || "").trim().toUpperCase(),
            ten_loai: String(input.ten || "").trim(),
            is_active: true,
            updated_at: now,
          },
        },
      ],
    };
  }
  const id = String(snap.loai?.id || input.loaiDungCuId || "").trim();
  if (!id) return { ok: false, error: "Không tìm thấy loại dụng cụ để duyệt." };
  if (input.loaiThaoTac === "XOA") {
    return { ok: true, ops: [{ op: "soft_delete", table: "cssd_dm_loai_dung_cu", id }] };
  }
  const row: Record<string, unknown> = { updated_at: now };
  if (input.ten) row.ten_loai = String(input.ten).trim();
  if (input.ma) row.ma_loai = String(input.ma).trim().toUpperCase();
  return { ok: true, ops: [{ op: "update", table: "cssd_dm_loai_dung_cu", id, row }] };
}

function planBo(
  input: CatalogChangeDraftInput,
  snap: CatalogMasterSnapshot,
  now: string,
): { ok: true; ops: CatalogApplyOp[] } | { ok: false; error: string } {
  if (input.loaiThaoTac === "THEM") {
    return {
      ok: true,
      ops: [
        {
          op: "insert",
          table: "cssd_dm_bo_dung_cu",
          row: {
            ma_bo: String(input.ma || input.maBo || "").trim().toUpperCase(),
            ten_bo: String(input.ten || "").trim(),
            loai_dung_cu_id: input.loaiDungCuId || null,
            is_active: true,
            updated_at: now,
          },
        },
      ],
    };
  }
  const id = String(snap.bo?.id || "").trim();
  if (!id) return { ok: false, error: "Không tìm thấy bộ dụng cụ để duyệt." };
  if (input.loaiThaoTac === "XOA") {
    return { ok: true, ops: [{ op: "soft_delete", table: "cssd_dm_bo_dung_cu", id }] };
  }
  const row: Record<string, unknown> = { updated_at: now };
  if (input.ten) row.ten_bo = String(input.ten).trim();
  return { ok: true, ops: [{ op: "update", table: "cssd_dm_bo_dung_cu", id, row }] };
}

function planChiTiet(
  input: CatalogChangeDraftInput,
  snap: CatalogMasterSnapshot,
  qty: number,
  now: string,
): { ok: true; ops: CatalogApplyOp[] } | { ok: false; error: string } {
  if (input.loaiThaoTac === "THEM") {
    const boId = String(snap.bo?.id || "").trim();
    if (!boId) return { ok: false, error: "Không tìm thấy bộ nguồn để thêm thành phần." };
    const ten = String(input.ten || "").trim() || "Dụng cụ lẻ";
    return {
      ok: true,
      ops: [
        {
          op: "insert",
          table: "cssd_dm_bo_dung_cu_chi_tiet",
          row: {
            bo_dung_cu_id: boId,
            loai_dung_cu_id: input.loaiDungCuId || null,
            ten_dung_cu_le: ten,
            ten_chi_tiet: ten,
            so_luong: qty,
            is_active: true,
            updated_at: now,
          },
        },
      ],
    };
  }
  const id = String(snap.chiTiet?.id || input.chiTietId || "").trim();
  if (!id) return { ok: false, error: "Không tìm thấy dòng thành phần để duyệt." };
  if (input.loaiThaoTac === "XOA") {
    return { ok: true, ops: [{ op: "soft_delete", table: "cssd_dm_bo_dung_cu_chi_tiet", id }] };
  }
  const row: Record<string, unknown> = { updated_at: now, so_luong: qty };
  if (input.ten) {
    row.ten_dung_cu_le = String(input.ten).trim();
    row.ten_chi_tiet = String(input.ten).trim();
  }
  return { ok: true, ops: [{ op: "update", table: "cssd_dm_bo_dung_cu_chi_tiet", id, row }] };
}

function planTransfer(
  input: CatalogChangeDraftInput,
  snap: CatalogMasterSnapshot,
  qty: number,
  now: string,
): { ok: true; ops: CatalogApplyOp[] } | { ok: false; error: string } {
  const src = snap.chiTiet;
  const boId = String(snap.bo?.id || src?.bo_dung_cu_id || "").trim();
  const loaiId = String(input.loaiDungCuId || src?.loai_dung_cu_id || "").trim();
  if (!boId || !loaiId) return { ok: false, error: "Thiếu bộ nguồn hoặc loại dụng cụ khi điều chuyển." };
  if (!src) return { ok: false, error: "Không có thành phần nguồn để điều chuyển." };
  if (src.so_luong < qty) {
    return { ok: false, error: `Số lượng không được vượt quá số trong bộ (${src.so_luong}).` };
  }

  const ops: CatalogApplyOp[] = [];
  const remain = src.so_luong - qty;
  if (remain <= 0) {
    ops.push({ op: "soft_delete", table: "cssd_dm_bo_dung_cu_chi_tiet", id: src.id });
  } else {
    ops.push({
      op: "update",
      table: "cssd_dm_bo_dung_cu_chi_tiet",
      id: src.id,
      row: { so_luong: remain, updated_at: now },
    });
  }

  const destMa = String(input.maBoDen || "").trim();
  if (!destMa) {
    const reserve = Math.max(0, Number(snap.reserve ?? 0) || 0);
    ops.push({
      op: "update",
      table: "cssd_dm_loai_dung_cu",
      id: loaiId,
      row: { so_luong_kho_du_phong: reserve + qty, updated_at: now },
    });
    ops.push({
      op: "ledger",
      loaiGiaoDich: "DIEU_CHUYEN",
      loaiDungCuId: loaiId,
      boDungCuId: boId,
      boDungCuIdDen: null,
      soLuong: qty,
      ghiChu: input.lyDo,
    });
    return { ok: true, ops };
  }

  const destBoId = String(snap.boDen?.id || "").trim();
  if (!destBoId) return { ok: false, error: "Không tìm thấy bộ đích theo mã." };
  if (snap.chiTietDen?.id) {
    ops.push({
      op: "update",
      table: "cssd_dm_bo_dung_cu_chi_tiet",
      id: snap.chiTietDen.id,
      row: { so_luong: snap.chiTietDen.so_luong + qty, updated_at: now },
    });
  } else {
    const ten = src.ten_dung_cu_le || "Dụng cụ lẻ";
    ops.push({
      op: "insert",
      table: "cssd_dm_bo_dung_cu_chi_tiet",
      row: {
        bo_dung_cu_id: destBoId,
        loai_dung_cu_id: loaiId,
        ten_dung_cu_le: ten,
        ten_chi_tiet: ten,
        so_luong: qty,
        is_active: true,
        updated_at: now,
      },
    });
  }
  ops.push({
    op: "ledger",
    loaiGiaoDich: "DIEU_CHUYEN",
    loaiDungCuId: loaiId,
    boDungCuId: boId,
    boDungCuIdDen: destBoId,
    soLuong: qty,
    ghiChu: input.lyDo,
  });
  return { ok: true, ops };
}
