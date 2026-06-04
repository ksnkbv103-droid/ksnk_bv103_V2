import { DanhMucItem } from "./types";
import { getAllLoaiDanhMucs, getRegistryEntry } from "./domain-registry";

/** Không còn cần thiết — giữ lại cho tương thích import cũ. */
export async function addResolvedLoaiValues(
  _supabase: any,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  void _supabase;
  const { loai_id: _drop, ...rest } = input;
  void _drop;
  return rest;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tìm một bản ghi danh mục theo id, tối ưu hóa hiệu năng bằng cách quét bảng gộp và song song hóa bảng vật lý. */
export async function getDanhMucItemById(
  supabase: any,
  id: string
): Promise<DanhMucItem | null> {
  if (!id) return null;

  // 1. Quét nhanh trong bảng gộp sys_lookup_value nếu id là UUID hợp lệ
  if (UUID_REGEX.test(id)) {
    const { data: lookupData, error: lookupErr } = await supabase
      .from("sys_lookup_value")
      .select("id, category_type, code, name, is_active")
      .eq("id", id)
      .maybeSingle();

    if (!lookupErr && lookupData) {
      return {
        id: String(lookupData.id || ""),
        ma_danh_muc: String(lookupData.code || ""),
        ten_danh_muc: String(lookupData.name || ""),
        loai_danh_muc: lookupData.category_type,
        is_active: Boolean(lookupData.is_active),
        extra_data: null,
      };
    }
  }

  // 2. Nếu không tìm thấy hoặc id không phải UUID, quét song song các bảng vật lý còn lại
  const CONSOLIDATED_LOAIS = new Set([
    "CACH_THUC_GIAM_SAT",
    "CHUC_DANH",
    "CHUC_VU",
    "HINH_THUC_GIAM_SAT",
    "LOAI_CONG_VIEC",
    "LOAI_MAY_TIET_KHUAN",
    "LOAI_NKBV",
    "LOAI_SU_CO",
    "NGHE_NGHIEP",
    "TO_CONG_TAC",
    "TRANG_THAI_CONG_VIEC",
    "TRANG_THAI_NKBV_CA",
  ]);

  const physicalLoais = getAllLoaiDanhMucs().filter(
    (loai) => !CONSOLIDATED_LOAIS.has(loai)
  );

  // Tạo các promises truy vấn song song
  const queries = physicalLoais.map(async (loai) => {
    const registry = getRegistryEntry(loai);
    const selectColumns =
      registry.sourceTable === "sys_roles"
        ? `id, ${registry.maColumn}, ${registry.tenColumn}`
        : `id, ${registry.maColumn}, ${registry.tenColumn}, is_active`;

    const { data: dmData, error: dmErr } = await supabase
      .from(registry.sourceTable)
      .select(selectColumns)
      .eq("id", id)
      .maybeSingle();

    if (dmErr || !dmData) return null;

    return {
      id: String(dmData.id || ""),
      ma_danh_muc: String(dmData[registry.maColumn] || ""),
      ten_danh_muc: String(dmData[registry.tenColumn] || ""),
      loai_danh_muc: loai,
      is_active:
        registry.sourceTable === "sys_roles"
          ? true
          : Boolean(dmData.is_active),
      extra_data: null,
    };
  });

  const results = await Promise.all(queries);
  // Tìm kết quả hợp lệ đầu tiên không null
  const found = results.find((r) => r !== null);
  return found || null;
}

