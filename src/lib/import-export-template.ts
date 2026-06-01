type TemplatePreset = {
  orderedFields: string[];
  headerMap?: Record<string, string>;
};

const TECHNICAL_FIELDS = new Set(["id", "created_at", "updated_at", "__excel_row__"]);
const EXCLUDED_EXPORT_FIELDS_BY_TABLE: Record<string, Set<string>> = {
  dm_khoa_phong: new Set(["khoi_id"]),
  dm_roles: new Set<string>(),
  dm_bo_dung_cu: new Set(["loai_dung_cu_id", "khoa_su_dung_id"]),
  dm_bo_dung_cu_chi_tiet: new Set(["bo_dung_cu_id", "loai_dung_cu_id"]),
  mdm_nhan_su: new Set([
    "khoa_id",
    "to_id",
    "chuc_vu_id",
    "chuc_danh_id",
    "vai_tro_he_thong_id",
  ]),
};

/** Bảng có preset cột export/import khóa — dùng đồng bộ header khi đọc file. */
export function hasImportTemplatePreset(tableName: string): boolean {
  return Boolean(TEMPLATE_PRESETS[tableName]);
}

const TEMPLATE_PRESETS: Record<string, TemplatePreset> = {
  mdm_nhan_su: {
    orderedFields: [
      "ma_nv",
      "ho_ten",
      "ngay_sinh",
      "gioi_tinh",
      "ma_chuc_danh",
      "ma_chuc_vu",
      "ma_vai_tro_ksnk",
      "email",
      "so_dien_thoai",
      "ma_khoa",
      "ma_to",
      "ten_to_cong_tac",
      "is_active",
    ],
  },
  dm_bo_dung_cu: {
    orderedFields: [
      "ma_bo",
      "ten_bo",
      "ma_loai_dung_cu",
      "ten_loai_dung_cu",
      "ma_khoa_su_dung",
      "ten_khoa_su_dung",
      "quy_cach",
      "ghi_chu",
      "trang_thai",
      "ngay_kiem_ke_gan_nhat",
      "is_active",
    ],
  },
  dm_bo_dung_cu_chi_tiet: {
    orderedFields: [
      "ma_chi_tiet",
      "ten_chi_tiet",
      "ma_bo_cha",
      "ten_bo_cha",
      "ma_loai_dung_cu",
      "ten_loai_dung_cu",
      "so_luong",
      "max_suds_count",
      "trong_luong",
      "ghi_chu",
      "ma_qr_mau",
      "is_active",
    ],
  },
  dm_khoa_phong: {
    orderedFields: [
      "ma_khoa",
      "ten_khoa",
      "ma_khoi",
      "ten_khoi",
      "so_bac_si",
      "so_dieu_duong",
      "so_giuong_benh_thuong",
      "so_giuong_cap_cuu",
      "mo_ta_chuc_nang",
      "is_active",
    ],
  },
  dm_khoi_khoa: {
    orderedFields: ["ma_khoi", "ten_khoi", "is_active"],
  },
  dm_to_cong_tac: {
    orderedFields: ["ma_to", "ten_to", "is_active"],
  },
  dm_chuc_vu: {
    orderedFields: ["ma_chuc_vu", "ten_chuc_vu", "is_active"],
  },
  dm_chuc_danh: {
    orderedFields: ["ma_chuc_danh", "ten_chuc_danh", "is_active"],
  },
  dm_roles: {
    orderedFields: ["name", "description"],
  },
  dm_khu_vuc_giam_sat: {
    orderedFields: ["ma_khu_vuc", "ten_khu_vuc", "is_active"],
  },
  dm_nghe_nghiep: {
    orderedFields: ["ma_nghe_nghiep", "ten_nghe_nghiep", "is_active"],
  },
  dm_loai_dung_cu: {
    orderedFields: ["ma_loai_dung_cu", "ten_loai_dung_cu", "is_active"],
  },
  dm_hoa_chat: {
    orderedFields: [
      "ma_hoa_chat",
      "ten_hoa_chat",
      "loai_hoa_chat",
      "don_vi_tinh",
      "quy_cach",
      "nong_do",
      "han_su_dung",
      "ghi_chu",
      "is_active",
    ],
  },
  dm_thiet_bi: {
    orderedFields: [
      "ma_thiet_bi",
      "ten_thiet_bi",
      "loai_thiet_bi",
      "trang_thai",
      "hang_san_xuat",
      "nam_san_xuat",
      "ngay_dua_vao_su_dung",
      "chu_ky_bao_tri_ngay",
      "ngay_bao_tri_gan_nhat",
      "ngay_bao_tri_tiep_theo",
      "ghi_chu",
      "is_active",
    ],
  },
  dm_hinh_thuc_giam_sat: {
    orderedFields: ["ma_hinh_thuc", "ten_hinh_thuc", "is_active"],
  },
  dm_cach_thuc_giam_sat: {
    orderedFields: ["ma_cach_thuc", "ten_cach_thuc", "is_active"],
  },
  dm_loai_cong_viec: {
    orderedFields: ["ma_loai", "ten_loai", "is_active"],
  },
  dm_trang_thai_cong_viec: {
    orderedFields: ["ma_trang_thai", "ten_trang_thai", "is_active"],
  },
  dm_loai_su_co: {
    orderedFields: ["ma_loai_su_co", "ten_loai_su_co", "is_active"],
  },
  dm_loai_may_tiet_khuan: {
    orderedFields: ["ma_loai_may", "ten_loai_may", "is_active"],
  },
  dm_loai_nkbv: {
    orderedFields: ["ma_loai", "ten_loai", "is_active"],
  },
  dm_trang_thai_nkbv_ca: {
    orderedFields: ["ma_trang_thai", "ten_trang_thai", "thu_tu", "is_active"],
  },
};

const TABLES_WITHOUT_IS_ACTIVE = new Set(["dm_roles"]);

export function buildLockedTemplateMapping(params: {
  tableName: string;
  uniqueKey: string;
  baseMapping: Record<string, string>;
  data?: Array<Record<string, unknown>>;
}) {
  const { tableName, uniqueKey, baseMapping, data } = params;
  const preset = TEMPLATE_PRESETS[tableName];
  const excludedFields = EXCLUDED_EXPORT_FIELDS_BY_TABLE[tableName] || new Set<string>();
  const headerByField = new Map<string, string>();

  Object.entries(baseMapping).forEach(([header, field]) => {
    headerByField.set(field, header);
  });

  const detectedFields = new Set<string>();
  (data || []).forEach((item) => {
    Object.keys(item || {}).forEach((field) => {
      if (!TECHNICAL_FIELDS.has(field)) detectedFields.add(field);
    });
  });

  const orderedPool = [
    ...(preset?.orderedFields || []),
    ...Object.values(baseMapping),
    ...Array.from(detectedFields).sort(),
  ];

  const seen = new Set<string>();
  const orderedFields = orderedPool.filter((field) => {
    if (!field || TECHNICAL_FIELDS.has(field) || excludedFields.has(field) || seen.has(field)) return false;
    seen.add(field);
    return true;
  });

  if (!seen.has(uniqueKey)) orderedFields.unshift(uniqueKey);
  const includeIsActive = !TABLES_WITHOUT_IS_ACTIVE.has(tableName);
  if (includeIsActive && !seen.has("is_active")) orderedFields.push("is_active");

  const finalFields = includeIsActive
    ? [uniqueKey, ...orderedFields.filter((f) => f !== uniqueKey && f !== "is_active"), "is_active"]
    : [uniqueKey, ...orderedFields.filter((f) => f !== uniqueKey)];
  const mapping: Record<string, string> = {};

  finalFields.forEach((field) => {
    const header = preset?.headerMap?.[field] || headerByField.get(field) || field;
    mapping[header] = field;
  });

  return mapping;
}
