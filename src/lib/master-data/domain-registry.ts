// src/lib/master-data/domain-registry.ts
// **Registry pattern** (map loaiDanhMuc → `{module}_dm_*`) — KHÔNG phải `src/lib/domain/` (pure business logic).
// Source-of-Truth: bảng/view prefix module (`mdm_dm_*`, `cssd_dm_*`, `gstt_dm_*`, …).
// Không còn fallback về danh_muc_tuy_bien.
// Đọc dropdown đồng bộ: `fetchActiveRegistryDmRows` trong `registry-select-fetch.ts`.

export type MasterSource =
  | "mdm_dm_khoi_khoa"
  | "mdm_dm_khoa_phong"
  | "mdm_dm_to_cong_tac"
  | "mdm_dm_chuc_vu"
  | "mdm_dm_chuc_danh"
  | "sys_roles"
  | "gstt_dm_khu_vuc_giam_sat"
  | "mdm_dm_nghe_nghiep"
  | "cssd_dm_loai_dung_cu"
  | "cssd_dm_loai_su_co"
  | "cssd_dm_loai_may"
  | "cssd_dm_tram"
  | "gstt_dm_hinh_thuc_giam_sat"
  | "gstt_dm_cach_thuc_giam_sat"
  | "qlcv_dm_loai_cong_viec"
  | "qlcv_dm_trang_thai_cong_viec"
  | "nkbv_dm_loai"
  | "nkbv_dm_trang_thai_ca";

export type RegistryEntry = {
  loaiDanhMuc: string;
  sourceTable: MasterSource;
  idColumn: string;
  maColumn: string;
  tenColumn: string;
};

const ENTRIES: RegistryEntry[] = [
  { loaiDanhMuc: "KHOI_KHOA", sourceTable: "mdm_dm_khoi_khoa", idColumn: "id", maColumn: "ma_khoi", tenColumn: "ten_khoi" },
  { loaiDanhMuc: "KHOA_PHONG", sourceTable: "mdm_dm_khoa_phong", idColumn: "id", maColumn: "ma_khoa", tenColumn: "ten_khoa" },
  { loaiDanhMuc: "TO_CONG_TAC", sourceTable: "mdm_dm_to_cong_tac", idColumn: "id", maColumn: "ma_to", tenColumn: "ten_to" },
  { loaiDanhMuc: "CHUC_VU", sourceTable: "mdm_dm_chuc_vu", idColumn: "id", maColumn: "ma_chuc_vu", tenColumn: "ten_chuc_vu" },
  { loaiDanhMuc: "CHUC_DANH", sourceTable: "mdm_dm_chuc_danh", idColumn: "id", maColumn: "ma_chuc_danh", tenColumn: "ten_chuc_danh" },
  { loaiDanhMuc: "VAI_TRO_HE_THONG_KSNK", sourceTable: "sys_roles", idColumn: "id", maColumn: "name", tenColumn: "name" },
  { loaiDanhMuc: "KHU_VUC_GIAM_SAT", sourceTable: "gstt_dm_khu_vuc_giam_sat", idColumn: "id", maColumn: "ma_khu_vuc", tenColumn: "ten_khu_vuc" },
  { loaiDanhMuc: "NGHE_NGHIEP", sourceTable: "mdm_dm_nghe_nghiep", idColumn: "id", maColumn: "ma_nghe_nghiep", tenColumn: "ten_nghe_nghiep" },
  { loaiDanhMuc: "LOAI_DUNG_CU", sourceTable: "cssd_dm_loai_dung_cu", idColumn: "id", maColumn: "ma_loai_dung_cu", tenColumn: "ten_loai_dung_cu" },
  { loaiDanhMuc: "LOAI_SU_CO", sourceTable: "cssd_dm_loai_su_co", idColumn: "id", maColumn: "ma_loai_su_co", tenColumn: "ten_loai_su_co" },
  { loaiDanhMuc: "LOAI_MAY_TIET_KHUAN", sourceTable: "cssd_dm_loai_may", idColumn: "id", maColumn: "ma_loai_may", tenColumn: "ten_loai_may" },
  { loaiDanhMuc: "TRAM_CSSD", sourceTable: "cssd_dm_tram", idColumn: "id", maColumn: "ma_tram", tenColumn: "ten_tram" },
  { loaiDanhMuc: "HINH_THUC_GIAM_SAT", sourceTable: "gstt_dm_hinh_thuc_giam_sat", idColumn: "id", maColumn: "ma_hinh_thuc", tenColumn: "ten_hinh_thuc" },
  { loaiDanhMuc: "CACH_THUC_GIAM_SAT", sourceTable: "gstt_dm_cach_thuc_giam_sat", idColumn: "id", maColumn: "ma_cach_thuc", tenColumn: "ten_cach_thuc" },
  { loaiDanhMuc: "LOAI_CONG_VIEC", sourceTable: "qlcv_dm_loai_cong_viec", idColumn: "id", maColumn: "ma", tenColumn: "ten" },
  { loaiDanhMuc: "TRANG_THAI_CONG_VIEC", sourceTable: "qlcv_dm_trang_thai_cong_viec", idColumn: "id", maColumn: "ma", tenColumn: "ten" },
  { loaiDanhMuc: "LOAI_NKBV", sourceTable: "nkbv_dm_loai", idColumn: "id", maColumn: "ma_loai", tenColumn: "ten_loai" },
  {
    loaiDanhMuc: "TRANG_THAI_NKBV_CA",
    sourceTable: "nkbv_dm_trang_thai_ca",
    idColumn: "id",
    maColumn: "ma_trang_thai",
    tenColumn: "ten_trang_thai",
  },
];

/** Trả về registry entry cho loại danh mục. Nếu không tìm thấy → throw lỗi rõ ràng. */
export function getRegistryEntry(loaiDanhMuc: string): RegistryEntry {
  const entry = ENTRIES.find((x) => x.loaiDanhMuc === loaiDanhMuc);
  if (!entry) {
    throw new Error(
      `[domain-registry] Không tìm thấy loại danh mục "${loaiDanhMuc}". ` +
      `Tất cả loại phải được đăng ký trong ENTRIES.`
    );
  }
  return entry;
}

/** Trả về registry entry hoặc null (dùng khi cần kiểm tra an toàn mà không throw). */
export function getRegistryEntryOrNull(loaiDanhMuc: string): RegistryEntry | null {
  return ENTRIES.find((x) => x.loaiDanhMuc === loaiDanhMuc) || null;
}

/** Lấy danh sách tất cả loại danh mục đã đăng ký. */
export function getAllLoaiDanhMucs(): string[] {
  return ENTRIES.map((x) => x.loaiDanhMuc);
}

/** Lấy tất cả các entries đã đăng ký. */
export function getAllRegistryEntries(): RegistryEntry[] {
  return [...ENTRIES];
}

/**
 * Các `loaiDanhMuc` đã có trang riêng ở tab Trung tâm Danh mục — không hiển thị lặp trong tab
 * "Danh mục chuyên biệt" (cùng một SSOT `{module}_dm_*`, tránh hai đường vào một bảng).
 */
export const REGISTRY_LOAI_TRUNG_TAM_ONLY: ReadonlySet<string> = new Set(["KHOA_PHONG", "LOAI_DUNG_CU"]);

/** Danh sách registry dùng cho tab chuyên biệt (đã trừ các loại chỉ quản lý tại Trung tâm). */
export function getRegistryEntriesForChuyenBietHub(): RegistryEntry[] {
  return ENTRIES.filter((e) => !REGISTRY_LOAI_TRUNG_TAM_ONLY.has(e.loaiDanhMuc));
}

/** Nhãn hiển thị Trung tâm danh mục (hub các bảng danh mục module). */
export const DM_HUB_LABELS: Record<string, string> = {
  KHOI_KHOA: "Khối khoa",
  KHOA_PHONG: "Khoa phòng",
  TO_CONG_TAC: "Tổ công tác",
  CHUC_VU: "Chức vụ",
  CHUC_DANH: "Chức danh",
  VAI_TRO_HE_THONG_KSNK: "Vai trò hệ thống KSNK",
  KHU_VUC_GIAM_SAT: "Khu vực giám sát",
  NGHE_NGHIEP: "Nghề nghiệp",
  LOAI_DUNG_CU: "Loại dụng cụ",
  LOAI_SU_CO: "Loại sự cố (CSSD)",
  LOAI_MAY_TIET_KHUAN: "Loại máy tiệt khuẩn",
  TRAM_CSSD: "Trạm workflow CSSD",
  HINH_THUC_GIAM_SAT: "Hình thức giám sát",
  CACH_THUC_GIAM_SAT: "Cách thức giám sát",
  LOAI_CONG_VIEC: "Loại công việc",
  TRANG_THAI_CONG_VIEC: "Trạng thái công việc",
  LOAI_NKBV: "Loại ca NKBV / HAI",
  TRANG_THAI_NKBV_CA: "Trạng thái phiếu NKBV",
};
